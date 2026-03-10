import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request

# Load environment variables from .env when running locally.
load_dotenv()

CLASH_API_BASE = "https://api.clashroyale.com/v1"
DISPLAY_LEVEL_CAP = 16
DEFAULT_TIMEOUT_SECONDS = 10.0
TAG_PATTERN = re.compile(r"^[A-Z0-9]{3,15}$")

STORAGE_DIR = Path(__file__).resolve().parent / "local_data"
STORAGE_FILE = STORAGE_DIR / "profiles.json"
MAX_HISTORY_ITEMS = 40
ALLOWED_PLAYSTYLES = {"aggressive", "control", "beatdown", "cycle", "bait", "no_preference"}

app = Flask(__name__, static_folder=".", static_url_path="")


class ApiError(Exception):
    """Controlled server error with safe message and status code."""

    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat()


def sanitize_player_tag(raw_tag: str) -> str:
    """Normalize and validate player tag input from client."""
    tag = str(raw_tag or "").strip().upper().replace("#", "")
    tag = re.sub(r"[^A-Z0-9]", "", tag)

    if not tag:
        raise ApiError("Missing player tag.", 400)
    if not TAG_PATTERN.fullmatch(tag):
        raise ApiError("Invalid player tag format.", 400)

    return tag


def normalized_card_level(level_value, max_level_value) -> int:
    """Convert Clash API card level into in-game display level (1-16)."""
    level = int(level_value or 0)
    max_level = int(max_level_value or 0)

    if level <= 0:
        return 0

    # Clash API can return rarity-relative levels; shift to display scale.
    if 0 < max_level <= DISPLAY_LEVEL_CAP:
        level = level + (DISPLAY_LEVEL_CAP - max_level)

    return max(1, min(DISPLAY_LEVEL_CAP, level))


def fetch_player_data(clean_tag: str, token: str) -> dict:
    """Call official Clash Royale API and return the raw player payload."""
    timeout = float(os.getenv("CR_API_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS))
    encoded_tag = quote(f"#{clean_tag}", safe="")
    url = f"{CLASH_API_BASE}/players/{encoded_tag}"

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    try:
        response = requests.get(url, headers=headers, timeout=timeout)
    except requests.Timeout as exc:
        raise ApiError("Clash Royale API request timed out.", 504) from exc
    except requests.RequestException as exc:
        raise ApiError("Could not reach Clash Royale API.", 502) from exc

    if response.status_code == 404:
        raise ApiError("Player tag not found.", 404)
    if response.status_code in (401, 403):
        raise ApiError("Server cannot access Clash Royale API with current token.", 502)
    if response.status_code == 429:
        raise ApiError("Clash Royale API rate limit reached. Try again soon.", 503)
    if not response.ok:
        raise ApiError("Clash Royale API returned an unexpected response.", 502)

    try:
        return response.json()
    except ValueError as exc:
        raise ApiError("Clash Royale API returned invalid JSON.", 502) from exc


def extract_player_profile(payload: dict, clean_tag: str) -> dict:
    """Extract lightweight player profile fields for frontend."""
    arena = payload.get("arena") or {}

    return {
        "name": payload.get("name") or "Unknown",
        "tag": payload.get("tag") or f"#{clean_tag}",
        "trophies": payload.get("trophies") or 0,
        "bestTrophies": payload.get("bestTrophies") or 0,
        "arena": arena.get("name") or "Unknown Arena",
        "arenaId": arena.get("id") or 0,
    }


def extract_and_sort_cards(payload: dict) -> list[dict]:
    """Extract cards and sort by highest level, then alphabetically."""
    cards = payload.get("cards") or []
    extracted = []

    for card in cards:
        level = normalized_card_level(card.get("level"), card.get("maxLevel"))
        max_level = int(card.get("maxLevel") or 0)
        count = int(card.get("count") or 0)
        evo_level = int(card.get("evolutionLevel") or 0)

        icon_urls = card.get("iconUrls") or {}
        icon_url = icon_urls.get("medium") or icon_urls.get("evolutionMedium") or ""

        extracted.append(
            {
                "id": int(card.get("id") or 0),
                "name": card.get("name") or "Unknown",
                "level": level,
                "maxLevel": max_level,
                "count": count,
                "evolutionLevel": evo_level,
                "iconUrl": icon_url,
            }
        )

    extracted.sort(key=lambda item: (-item["level"], item["name"].lower()))
    return extracted


def maybe_save_raw_response(clean_tag: str, payload: dict, should_save: bool) -> str | None:
    """Optionally persist raw API response for local debugging."""
    if not should_save:
        return None

    debug_dir = Path(__file__).resolve().parent / "debug_raw"
    debug_dir.mkdir(parents=True, exist_ok=True)

    timestamp = int(time.time())
    file_path = debug_dir / f"player_{clean_tag}_{timestamp}.json"
    file_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    return str(file_path.relative_to(Path(__file__).resolve().parent))


def load_storage_payload() -> dict:
    """Read local storage JSON used for profiles/history."""
    if not STORAGE_FILE.exists():
        return {"profiles": {}}

    try:
        payload = json.loads(STORAGE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"profiles": {}}

    if not isinstance(payload, dict):
        return {"profiles": {}}

    profiles = payload.get("profiles")
    if not isinstance(profiles, dict):
        payload["profiles"] = {}

    return payload


def save_storage_payload(payload: dict) -> None:
    """Persist local storage JSON atomically."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    tmp_path = STORAGE_FILE.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    tmp_path.replace(STORAGE_FILE)


def ensure_profile_record(payload: dict, clean_tag: str) -> dict:
    """Get or create a normalized profile record."""
    profiles = payload.setdefault("profiles", {})
    record = profiles.get(clean_tag)

    if not isinstance(record, dict):
        record = {
            "playerTag": f"#{clean_tag}",
            "playerProfile": {},
            "cards": [],
            "favoriteDeck": None,
            "preferredPlaystyle": "no_preference",
            "recentAnalysis": None,
            "history": [],
            "updatedAt": utc_now_iso(),
        }
        profiles[clean_tag] = record

    record.setdefault("playerTag", f"#{clean_tag}")
    record.setdefault("playerProfile", {})
    record.setdefault("cards", [])
    record.setdefault("favoriteDeck", None)
    record.setdefault("preferredPlaystyle", "no_preference")
    record.setdefault("recentAnalysis", None)
    record.setdefault("history", [])
    record.setdefault("updatedAt", utc_now_iso())

    return record


def summarize_profile(clean_tag: str, record: dict) -> dict:
    profile = record.get("playerProfile") if isinstance(record.get("playerProfile"), dict) else {}
    return {
        "tag": f"#{clean_tag}",
        "name": profile.get("name") or "Unknown",
        "trophies": int(profile.get("trophies") or 0),
        "preferredPlaystyle": record.get("preferredPlaystyle") or "no_preference",
        "hasFavoriteDeck": bool(record.get("favoriteDeck")),
        "updatedAt": record.get("updatedAt") or "",
    }


def validate_storage_body() -> dict:
    body = request.get_json(silent=True)
    if body is None:
        return {}
    if not isinstance(body, dict):
        raise ApiError("Invalid JSON body.", 400)
    return body


@app.get("/api/player/<player_tag>")
def api_get_player(player_tag: str):
    """Server API route used by frontend to fetch collection safely."""
    token = os.getenv("CR_API_TOKEN", "").strip()
    if not token:
        return jsonify({"error": "Server token missing. Set CR_API_TOKEN."}), 500

    try:
        clean_tag = sanitize_player_tag(player_tag)

        raw_payload = fetch_player_data(clean_tag, token)
        profile = extract_player_profile(raw_payload, clean_tag)
        cards = extract_and_sort_cards(raw_payload)

        if not cards:
            raise ApiError("No cards returned for this player.", 502)

        save_raw_env = os.getenv("CR_SAVE_RAW_RESPONSE", "0") == "1"
        save_raw_query = request.args.get("debug", "0") == "1"
        saved_path = maybe_save_raw_response(clean_tag, raw_payload, save_raw_env or save_raw_query)

        return jsonify(
            {
                "player": profile,
                "cards": cards,
                "meta": {
                    "cardCount": len(cards),
                    "rawSavedPath": saved_path,
                },
            }
        )

    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        return jsonify({"error": "Unexpected server error while loading player data."}), 500


@app.get("/api/storage/profiles")
def api_storage_profiles():
    """List saved profile summaries for local app usage."""
    payload = load_storage_payload()
    profiles = payload.get("profiles") or {}

    summaries = [
        summarize_profile(clean_tag, record)
        for clean_tag, record in profiles.items()
        if isinstance(record, dict)
    ]
    summaries.sort(key=lambda item: item.get("updatedAt", ""), reverse=True)

    return jsonify({"profiles": summaries})


@app.get("/api/storage/profile/<player_tag>")
def api_storage_get_profile(player_tag: str):
    """Load one saved profile record by player tag."""
    try:
        clean_tag = sanitize_player_tag(player_tag)
        payload = load_storage_payload()
        record = (payload.get("profiles") or {}).get(clean_tag)

        if not isinstance(record, dict):
            raise ApiError("Saved profile not found.", 404)

        return jsonify({"profile": record})
    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        return jsonify({"error": "Unexpected storage error."}), 500


@app.post("/api/storage/profile/<player_tag>")
def api_storage_save_profile(player_tag: str):
    """Create/update local saved profile record."""
    try:
        clean_tag = sanitize_player_tag(player_tag)
        body = validate_storage_body()

        payload = load_storage_payload()
        record = ensure_profile_record(payload, clean_tag)

        player_profile = body.get("playerProfile")
        if isinstance(player_profile, dict):
            record["playerProfile"] = player_profile

        cards = body.get("cards")
        if isinstance(cards, list):
            # Keep a practical upper bound for local JSON size.
            record["cards"] = cards[:200]

        if "favoriteDeck" in body:
            favorite = body.get("favoriteDeck")
            if favorite is None or isinstance(favorite, dict):
                record["favoriteDeck"] = favorite

        if "preferredPlaystyle" in body:
            style = str(body.get("preferredPlaystyle") or "no_preference").strip().lower()
            record["preferredPlaystyle"] = style if style in ALLOWED_PLAYSTYLES else "no_preference"

        if "recentAnalysis" in body:
            recent = body.get("recentAnalysis")
            if recent is None or isinstance(recent, (dict, str)):
                record["recentAnalysis"] = recent

        if isinstance(body.get("history"), list):
            history = [item for item in body.get("history") if isinstance(item, dict)]
            record["history"] = history[:MAX_HISTORY_ITEMS]

        record["playerTag"] = f"#{clean_tag}"
        record["updatedAt"] = utc_now_iso()

        save_storage_payload(payload)
        return jsonify({"ok": True, "profile": record})
    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        return jsonify({"error": "Unexpected storage error."}), 500


@app.post("/api/storage/history/<player_tag>")
def api_storage_append_history(player_tag: str):
    """Append a history entry to a saved profile."""
    try:
        clean_tag = sanitize_player_tag(player_tag)
        body = validate_storage_body()

        entry = body.get("entry")
        if not isinstance(entry, dict):
            raise ApiError("Missing history entry.", 400)

        safe_entry = {
            "type": str(entry.get("type") or "note")[:40],
            "title": str(entry.get("title") or "")[:140],
            "detail": str(entry.get("detail") or "")[:1200],
            "createdAt": str(entry.get("createdAt") or utc_now_iso())[:64],
        }

        payload = load_storage_payload()
        record = ensure_profile_record(payload, clean_tag)

        history = record.get("history") if isinstance(record.get("history"), list) else []
        history.insert(0, safe_entry)
        record["history"] = history[:MAX_HISTORY_ITEMS]
        record["updatedAt"] = utc_now_iso()

        save_storage_payload(payload)
        return jsonify({"ok": True, "historyCount": len(record["history"])})
    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        return jsonify({"error": "Unexpected storage error."}), 500


@app.delete("/api/storage/history/<player_tag>")
def api_storage_clear_history(player_tag: str):
    """Clear saved history for one profile."""
    try:
        clean_tag = sanitize_player_tag(player_tag)
        payload = load_storage_payload()
        record = ensure_profile_record(payload, clean_tag)
        record["history"] = []
        record["updatedAt"] = utc_now_iso()
        save_storage_payload(payload)
        return jsonify({"ok": True})
    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        return jsonify({"error": "Unexpected storage error."}), 500


@app.post("/api/storage/pin/<player_tag>")
def api_storage_pin_deck(player_tag: str):
    """Save a favorite/pinned deck for a profile."""
    try:
        clean_tag = sanitize_player_tag(player_tag)
        body = validate_storage_body()

        favorite_deck = body.get("favoriteDeck")
        if favorite_deck is not None and not isinstance(favorite_deck, dict):
            raise ApiError("Invalid favorite deck payload.", 400)

        payload = load_storage_payload()
        record = ensure_profile_record(payload, clean_tag)
        record["favoriteDeck"] = favorite_deck
        record["updatedAt"] = utc_now_iso()

        save_storage_payload(payload)
        return jsonify({"ok": True, "favoriteDeck": record.get("favoriteDeck")})
    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        return jsonify({"error": "Unexpected storage error."}), 500


@app.get("/")
def root_index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "0") == "1")
