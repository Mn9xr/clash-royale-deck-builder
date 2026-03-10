import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import requests
from coach_prompt_builder import build_clash_royale_prompt, sanitize_player_context
from coach_system_prompt import CLASH_ROYALE_COACH_SYSTEM_PROMPT
from deck_explorer_service import DeckExplorerError, DeckExplorerService
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from ollama_service import OllamaServiceError, call_ollama_chat

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

STATUS_ACTIVITY_LIMIT = 80
STATUS_STALE_SECONDS = max(60, int(os.getenv("STATUS_STALE_SECONDS", "900")))
APP_BUILD_LABEL = os.getenv("APP_BUILD_LABEL", "local-dev")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").strip() or "http://127.0.0.1:11434"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b").strip() or "llama3.1:8b"

try:
    OLLAMA_TIMEOUT_SECONDS = max(5.0, float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "45")))
except ValueError:
    OLLAMA_TIMEOUT_SECONDS = 45.0

try:
    OLLAMA_SESSION_TTL_SECONDS = max(300, int(os.getenv("OLLAMA_SESSION_TTL_SECONDS", "7200")))
except ValueError:
    OLLAMA_SESSION_TTL_SECONDS = 7200

try:
    OLLAMA_HISTORY_MESSAGES = max(2, int(os.getenv("OLLAMA_HISTORY_MESSAGES", "8")))
except ValueError:
    OLLAMA_HISTORY_MESSAGES = 8

CHAT_SESSION_LIMIT = 200

app = Flask(__name__, static_folder=".", static_url_path="")


deck_explorer_service = DeckExplorerService(
    cache_seconds=int(os.getenv("DECK_CACHE_SECONDS", "900")),
    timeout_seconds=float(os.getenv("CR_API_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS)),
    top_players_limit=int(os.getenv("DECK_TOP_PLAYERS_LIMIT", "40")),
)

RUNTIME_STATUS = {
    "playerFetchState": "stale",
    "lastSuccessfulPlayerFetch": "",
    "lastPlayerTag": "",
    "deckSyncState": "stale",
    "lastDeckSync": "",
    "chatbotState": "stale",
    "lastChatbotUpdate": "",
    "chatbotLastError": "",
    "chatbotVersion": f"ollama:{OLLAMA_MODEL}",
    "buildLabel": APP_BUILD_LABEL,
}

ACTIVITY_LOG: list[dict] = []
CHAT_SESSIONS: dict[str, dict] = {}


class ApiError(Exception):
    """Controlled server error with safe message and status code."""

    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat()


def parse_iso(value: str) -> datetime | None:
    raw = str(value or "").strip()
    if not raw:
        return None

    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def derive_status(last_timestamp: str, desired_state: str = "online") -> str:
    if desired_state == "error":
        return "error"

    dt = parse_iso(last_timestamp)
    if not dt:
        return "stale"

    age_seconds = (datetime.now(tz=timezone.utc) - dt).total_seconds()
    if age_seconds > STATUS_STALE_SECONDS:
        return "stale"

    return desired_state


def push_activity(component: str, state: str, message: str, detail: str = "") -> None:
    entry = {
        "component": str(component or "system")[:40],
        "state": str(state or "online")[:20],
        "message": str(message or "")[:220],
        "detail": str(detail or "")[:700],
        "createdAt": utc_now_iso(),
    }
    ACTIVITY_LOG.insert(0, entry)
    del ACTIVITY_LOG[STATUS_ACTIVITY_LIMIT:]


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


def sanitize_chat_session_id(raw_value: str | None) -> str:
    value = re.sub(r"[^a-zA-Z0-9_-]", "", str(raw_value or "").strip())
    if 8 <= len(value) <= 64:
        return value
    return uuid.uuid4().hex[:20]


def prune_chat_sessions() -> None:
    now = time.time()

    stale_ids = []
    for session_id, record in CHAT_SESSIONS.items():
        updated_at = float(record.get("updatedAt") or 0)
        if not updated_at or (now - updated_at) > OLLAMA_SESSION_TTL_SECONDS:
            stale_ids.append(session_id)

    for session_id in stale_ids:
        CHAT_SESSIONS.pop(session_id, None)

    if len(CHAT_SESSIONS) <= CHAT_SESSION_LIMIT:
        return

    ordered = sorted(
        CHAT_SESSIONS.items(),
        key=lambda entry: float((entry[1] or {}).get("updatedAt") or 0),
        reverse=True,
    )
    keep = {item[0] for item in ordered[:CHAT_SESSION_LIMIT]}
    for session_id in list(CHAT_SESSIONS.keys()):
        if session_id not in keep:
            CHAT_SESSIONS.pop(session_id, None)


def get_chat_history(session_id: str) -> list[dict]:
    record = CHAT_SESSIONS.get(session_id)
    if not isinstance(record, dict):
        return []

    history = record.get("messages")
    if not isinstance(history, list):
        return []

    cleaned: list[dict] = []
    for item in history:
        if not isinstance(item, dict):
            continue

        role = str(item.get("role") or "").strip().lower()
        if role not in {"user", "assistant"}:
            continue

        content = str(item.get("content") or "").strip()
        if not content:
            continue

        cleaned.append({"role": role, "content": content[:2000]})

    return cleaned[-OLLAMA_HISTORY_MESSAGES:]


def append_chat_history(session_id: str, user_message: str, assistant_message: str) -> None:
    if not session_id:
        return

    record = CHAT_SESSIONS.get(session_id)
    if not isinstance(record, dict):
        record = {"messages": [], "updatedAt": time.time()}
        CHAT_SESSIONS[session_id] = record

    messages = record.get("messages")
    if not isinstance(messages, list):
        messages = []

    messages.append({"role": "user", "content": str(user_message or "")[:2000]})
    messages.append({"role": "assistant", "content": str(assistant_message or "")[:2400]})

    max_messages = max(4, OLLAMA_HISTORY_MESSAGES * 2)
    record["messages"] = messages[-max_messages:]
    record["updatedAt"] = time.time()


def coach_suggestions_for_message(raw_message: str) -> list[str]:
    text = str(raw_message or "").lower()

    if any(token in text for token in ["upgrade", "priority", "gold"]):
        return ["what should I upgrade first", "must upgrade now", "don't waste gold yet", "analyze my deck"]

    if any(token in text for token in ["matchup", "counter", "losing"]):
        return ["good matchups?", "bad matchups?", "double elixir plan", "give me safer version"]

    if any(token in text for token in ["safe", "aggressive", "build", "best deck", "push"]):
        return ["best main deck", "best safer deck", "best aggressive deck", "load 1"]

    return [
        "build my best deck",
        "analyze my deck",
        "what should I upgrade first",
        "why am I losing",
    ]


@app.get("/api/status")
def api_status():
    """Lightweight product-health status for dashboard UI."""
    player_state = derive_status(
        RUNTIME_STATUS.get("lastSuccessfulPlayerFetch", ""),
        RUNTIME_STATUS.get("playerFetchState", "online"),
    )
    deck_state = derive_status(
        RUNTIME_STATUS.get("lastDeckSync", ""),
        RUNTIME_STATUS.get("deckSyncState", "online"),
    )
    chatbot_state = derive_status(
        RUNTIME_STATUS.get("lastChatbotUpdate", ""),
        RUNTIME_STATUS.get("chatbotState", "online"),
    )

    return jsonify(
        {
            "build": {
                "label": RUNTIME_STATUS.get("buildLabel", APP_BUILD_LABEL),
                "chatbotVersion": RUNTIME_STATUS.get("chatbotVersion", f"ollama:{OLLAMA_MODEL}"),
                "timestamp": utc_now_iso(),
            },
            "api": {
                "state": player_state,
                "lastSuccessfulPlayerFetch": RUNTIME_STATUS.get("lastSuccessfulPlayerFetch", ""),
                "lastPlayerTag": RUNTIME_STATUS.get("lastPlayerTag", ""),
            },
            "decks": {
                "state": deck_state,
                "lastDeckSync": RUNTIME_STATUS.get("lastDeckSync", ""),
                "cacheAgeSeconds": deck_explorer_service.cache_age_seconds(),
                "lastError": deck_explorer_service.last_error(),
            },
            "chatbot": {
                "state": chatbot_state,
                "lastUpdate": RUNTIME_STATUS.get("lastChatbotUpdate", ""),
                "lastError": RUNTIME_STATUS.get("chatbotLastError", ""),
                "provider": "ollama",
                "model": OLLAMA_MODEL,
            },
            "features": {
                "playerFetch": player_state,
                "deckExplorer": deck_state,
                "chatbot": chatbot_state,
                "storage": "online",
            },
            "activity": ACTIVITY_LOG[:20],
        }
    )


@app.post("/api/status/chatbot-ping")
def api_status_chatbot_ping():
    """Called by frontend chat flow to update last chatbot activity."""
    body = request.get_json(silent=True) or {}
    message = str(body.get("message") or "Chatbot response sent.")[:160]

    RUNTIME_STATUS["chatbotState"] = "online"
    RUNTIME_STATUS["chatbotLastError"] = ""
    RUNTIME_STATUS["chatbotVersion"] = f"ollama:{OLLAMA_MODEL}"
    RUNTIME_STATUS["lastChatbotUpdate"] = utc_now_iso()
    push_activity("chatbot", "online", message)

    return jsonify({"ok": True, "lastChatbotUpdate": RUNTIME_STATUS["lastChatbotUpdate"]})


@app.get("/api/decks/explorer")
def api_decks_explorer():
    """Deck explorer payload from official API + trusted reference snapshots."""
    token = os.getenv("CR_API_TOKEN", "").strip()
    force_refresh = request.args.get("refresh", "0") == "1"

    try:
        payload = deck_explorer_service.build_deck_database(token or None, force_refresh=force_refresh)

        meta = payload.get("meta") or {}
        counts = meta.get("counts") or {}
        total_decks = int(counts.get("total") or len(payload.get("decks") or []))
        has_official_data = bool(meta.get("hasOfficialData"))
        errors = meta.get("errors") or []

        state = "online" if (has_official_data or total_decks > 0) else "stale"
        if errors and not has_official_data:
            state = "stale" if total_decks > 0 else "error"

        RUNTIME_STATUS["deckSyncState"] = state
        RUNTIME_STATUS["lastDeckSync"] = str(meta.get("syncedAt") or utc_now_iso())

        detail = f"{total_decks} decks synced"
        if errors:
            detail = f"{detail}. {errors[0]}"
        push_activity("deck_explorer", state, "Deck explorer sync completed.", detail)

        return jsonify(payload)

    except DeckExplorerError as exc:
        RUNTIME_STATUS["deckSyncState"] = "error"
        push_activity("deck_explorer", "error", exc.message)
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        RUNTIME_STATUS["deckSyncState"] = "error"
        push_activity("deck_explorer", "error", "Unexpected deck explorer sync error.")
        return jsonify({"error": "Unexpected server error while syncing deck explorer."}), 500


@app.get("/api/player/<player_tag>")
def api_get_player(player_tag: str):
    """Server API route used by frontend to fetch collection safely."""
    token = os.getenv("CR_API_TOKEN", "").strip()
    if not token:
        RUNTIME_STATUS["playerFetchState"] = "error"
        push_activity("player_api", "error", "Player fetch failed: CR_API_TOKEN missing.")
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

        RUNTIME_STATUS["playerFetchState"] = "online"
        RUNTIME_STATUS["lastSuccessfulPlayerFetch"] = utc_now_iso()
        RUNTIME_STATUS["lastPlayerTag"] = profile.get("tag") or f"#{clean_tag}"
        push_activity(
            "player_api",
            "online",
            "Player collection fetched.",
            f"{profile.get('name') or 'Unknown'} {profile.get('tag') or f'#{clean_tag}'}",
        )

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
        if exc.status_code >= 500:
            RUNTIME_STATUS["playerFetchState"] = "error"
            push_activity("player_api", "error", exc.message)
        else:
            RUNTIME_STATUS["playerFetchState"] = "online"
            push_activity("player_api", "online", f"Player fetch validation: {exc.message}")
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        RUNTIME_STATUS["playerFetchState"] = "error"
        push_activity("player_api", "error", "Unexpected server error while loading player data.")
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

        push_activity("storage", "online", "Saved profile loaded.", f"#{clean_tag}")
        return jsonify({"profile": record})
    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        push_activity("storage", "error", "Unexpected storage error while loading profile.")
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
        push_activity("storage", "online", "Profile saved.", f"#{clean_tag}")
        return jsonify({"ok": True, "profile": record})
    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        push_activity("storage", "error", "Unexpected storage error while saving profile.")
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
        push_activity("storage", "error", "Unexpected storage error while appending history.")
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
        push_activity("storage", "online", "Profile history cleared.", f"#{clean_tag}")
        return jsonify({"ok": True})
    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        push_activity("storage", "error", "Unexpected storage error while clearing history.")
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
        push_activity("storage", "online", "Favorite deck updated.", f"#{clean_tag}")
        return jsonify({"ok": True, "favoriteDeck": record.get("favoriteDeck")})
    except ApiError as exc:
        return jsonify({"error": exc.message}), exc.status_code
    except Exception:
        push_activity("storage", "error", "Unexpected storage error while pinning deck.")
        return jsonify({"error": "Unexpected storage error."}), 500


@app.post("/api/chat/coach")
def api_chat_coach():
    """Ollama-backed Clash Royale coach endpoint for conversational chat."""
    try:
        body = validate_storage_body()

        message = str(body.get("message") or "").strip()
        if not message:
            raise ApiError("Missing chat message.", 400)
        if len(message) > 2000:
            raise ApiError("Chat message is too long.", 400)

        raw_context = body.get("context")
        if raw_context is not None and not isinstance(raw_context, dict):
            raise ApiError("Invalid chat context payload.", 400)

        session_id = sanitize_chat_session_id(body.get("sessionId"))
        context = sanitize_player_context(raw_context or {})
        prompt = build_clash_royale_prompt(context, message)

        prune_chat_sessions()
        history = get_chat_history(session_id)

        messages = [{"role": "system", "content": CLASH_ROYALE_COACH_SYSTEM_PROMPT}]
        messages.extend(history)
        messages.append({"role": "user", "content": prompt})

        result = call_ollama_chat(
            messages=messages,
            model=OLLAMA_MODEL,
            timeout_seconds=OLLAMA_TIMEOUT_SECONDS,
            base_url=OLLAMA_BASE_URL,
        )

        reply = str(result.get("content") or "").strip()
        if not reply:
            raise OllamaServiceError("Ollama returned an empty reply.", 502)

        append_chat_history(session_id, message, reply)

        model_name = str(result.get("model") or OLLAMA_MODEL)
        RUNTIME_STATUS["chatbotState"] = "online"
        RUNTIME_STATUS["chatbotLastError"] = ""
        RUNTIME_STATUS["chatbotVersion"] = f"ollama:{model_name}"
        RUNTIME_STATUS["lastChatbotUpdate"] = utc_now_iso()

        player_tag = str(context.get("playerTag") or "Unknown")
        owned_count = len(context.get("ownedCards") or [])
        deck_count = len(context.get("currentDeck") or [])
        push_activity(
            "chatbot",
            "online",
            "Ollama coach reply generated.",
            f"{player_tag} • deck={deck_count} • owned={owned_count} • model={model_name}",
        )

        return jsonify(
            {
                "reply": reply,
                "sessionId": session_id,
                "provider": "ollama",
                "model": model_name,
                "suggestions": coach_suggestions_for_message(message),
                "contextApplied": {
                    "playerTag": player_tag,
                    "collectionStatus": context.get("collectionStatus") or "unknown",
                    "ownedCards": owned_count,
                    "currentDeckCards": deck_count,
                },
            }
        )

    except ApiError as exc:
        if exc.status_code >= 500:
            RUNTIME_STATUS["chatbotState"] = "error"
            RUNTIME_STATUS["chatbotLastError"] = exc.message
            push_activity("chatbot", "error", exc.message)
        return jsonify({"error": exc.message}), exc.status_code

    except OllamaServiceError as exc:
        RUNTIME_STATUS["chatbotState"] = "error"
        RUNTIME_STATUS["chatbotLastError"] = exc.message
        push_activity("chatbot", "error", exc.message)
        return jsonify({"error": exc.message}), exc.status_code

    except Exception:
        RUNTIME_STATUS["chatbotState"] = "error"
        RUNTIME_STATUS["chatbotLastError"] = "Unexpected chatbot server error."
        push_activity("chatbot", "error", "Unexpected chatbot server error.")
        return jsonify({"error": "Unexpected server error while generating coach reply."}), 500


@app.get("/")
def root_index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "0") == "1")
