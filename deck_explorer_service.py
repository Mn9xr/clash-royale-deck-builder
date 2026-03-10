import hashlib
import json
import re
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

CLASH_API_BASE = "https://api.clashroyale.com/v1"
DEFAULT_TOP_PLAYERS_LIMIT = 40
CARD_EXPORT_PATTERN = re.compile(r"export const CARDS = (\[.*\]);\s*$", re.DOTALL)

WIN_CONDITION_SLUGS = {
    "balloon",
    "battle-ram",
    "elixir-golem",
    "goblin-barrel",
    "goblin-drill",
    "goblin-giant",
    "golem",
    "graveyard",
    "giant",
    "hog-rider",
    "lava-hound",
    "miner",
    "mortar",
    "ram-rider",
    "royal-giant",
    "royal-hogs",
    "skeleton-barrel",
    "wall-breakers",
    "x-bow",
}

BAIT_HINT_SLUGS = {"goblin-barrel", "princess", "dart-goblin", "rascals"}
BEATDOWN_HINT_SLUGS = {"golem", "lava-hound", "electro-giant", "giant", "goblin-giant"}


class DeckExplorerError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat()


def normalize_text(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").strip().lower())


def slugify(value: Any) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower())
    return slug.strip("-")


def safe_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


class DeckExplorerService:
    """Builds a normalized deck database using official API and trusted references."""

    def __init__(
        self,
        cache_seconds: int = 900,
        timeout_seconds: float = 10.0,
        top_players_limit: int = DEFAULT_TOP_PLAYERS_LIMIT,
        card_data_file: Path | None = None,
        reference_file: Path | None = None,
    ):
        root = Path(__file__).resolve().parent
        self.cache_seconds = max(60, int(cache_seconds))
        self.timeout_seconds = max(2.0, float(timeout_seconds))
        self.top_players_limit = max(10, min(100, int(top_players_limit)))
        self.card_data_file = card_data_file or (root / "cards-data.js")
        self.reference_file = reference_file or (root / "deck_reference_data.json")

        self._cached_payload: dict[str, Any] | None = None
        self._cached_at = 0.0
        self._last_sync_at = ""
        self._last_error = ""

        self._card_name_map, self._card_slug_map = self._load_card_reference()
        self._reference_sources, self._reference_decks = self._load_reference_decks()

    def cache_age_seconds(self) -> int:
        if not self._cached_payload or self._cached_at <= 0:
            return 0
        return max(0, int(time.time() - self._cached_at))

    def last_sync_at(self) -> str:
        return self._last_sync_at

    def last_error(self) -> str:
        return self._last_error

    def _load_card_reference(self) -> tuple[dict[str, dict], dict[str, dict]]:
        if not self.card_data_file.exists():
            return {}, {}

        try:
            raw = self.card_data_file.read_text(encoding="utf-8")
        except OSError:
            return {}, {}

        match = CARD_EXPORT_PATTERN.search(raw)
        if not match:
            return {}, {}

        try:
            cards = json.loads(match.group(1))
        except json.JSONDecodeError:
            return {}, {}

        by_name: dict[str, dict] = {}
        by_slug: dict[str, dict] = {}

        for card in cards:
            if not isinstance(card, dict):
                continue
            if str(card.get("variant") or "base") != "base":
                continue

            name = str(card.get("name") or "").strip()
            slug = str(card.get("slug") or "").strip() or slugify(name)
            if not name or not slug:
                continue

            normalized = {
                "id": card.get("id") or slug,
                "name": name,
                "slug": slug,
                "elixir": safe_float(card.get("elixir"), 0.0),
                "rarity": str(card.get("rarity") or "Unknown"),
                "type": str(card.get("type") or "Unknown"),
            }

            by_name[normalize_text(name)] = normalized
            by_slug[slug] = normalized

        return by_name, by_slug

    def _load_reference_decks(self) -> tuple[list[dict], list[dict]]:
        if not self.reference_file.exists():
            return [], []

        try:
            payload = json.loads(self.reference_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return [], []

        sources = payload.get("sources") if isinstance(payload, dict) else []
        decks = payload.get("decks") if isinstance(payload, dict) else []

        safe_sources = [item for item in sources if isinstance(item, dict)]
        safe_decks = [item for item in decks if isinstance(item, dict)]
        return safe_sources, safe_decks

    def _clone(self, payload: dict[str, Any]) -> dict[str, Any]:
        return json.loads(json.dumps(payload))

    def _lookup_card_meta(self, raw: Any) -> dict:
        if isinstance(raw, dict):
            name = str(raw.get("name") or "").strip()
            fallback_slug = slugify(name)
        else:
            name = str(raw or "").strip()
            fallback_slug = slugify(name)

        by_name = self._card_name_map.get(normalize_text(name))
        by_slug = self._card_slug_map.get(fallback_slug)
        meta = by_name or by_slug or {}

        card_id = raw.get("id") if isinstance(raw, dict) else None
        level = safe_int(raw.get("level"), 0) if isinstance(raw, dict) else 0
        max_level = safe_int(raw.get("maxLevel"), 0) if isinstance(raw, dict) else 0

        return {
            "id": card_id or meta.get("id") or fallback_slug or name,
            "name": name or meta.get("name") or "Unknown",
            "slug": meta.get("slug") or fallback_slug,
            "elixir": safe_float(meta.get("elixir"), 0.0),
            "rarity": meta.get("rarity") or "Unknown",
            "type": meta.get("type") or "Unknown",
            "level": level,
            "maxLevel": max_level,
        }

    def _normalize_cards(self, raw_cards: list[Any]) -> list[dict]:
        cards = []
        for raw in raw_cards:
            card = self._lookup_card_meta(raw)
            if not card.get("name") or not card.get("slug"):
                continue
            cards.append(card)
            if len(cards) >= 8:
                break
        return cards

    def _deck_signature(self, cards: list[dict]) -> str:
        parts = sorted(card.get("slug") or card.get("name") for card in cards)
        return "|".join(parts)

    def _average_elixir(self, cards: list[dict]) -> float:
        values = [safe_float(card.get("elixir"), 0.0) for card in cards if safe_float(card.get("elixir"), 0.0) > 0]
        if not values:
            return 0.0
        return round(sum(values) / len(values), 2)

    def _infer_archetype(self, cards: list[dict]) -> str:
        slugs = {card.get("slug") for card in cards}
        avg_elixir = self._average_elixir(cards)

        if "x-bow" in slugs or "mortar" in slugs:
            return "Siege"
        if "graveyard" in slugs:
            return "Graveyard Control"
        if slugs & BAIT_HINT_SLUGS and ("goblin-barrel" in slugs or "skeleton-barrel" in slugs):
            return "Bait"
        if slugs & BEATDOWN_HINT_SLUGS or avg_elixir >= 4.4:
            return "Beatdown"
        if "hog-rider" in slugs and avg_elixir <= 3.6:
            return "Cycle"
        if "royal-giant" in slugs:
            return "RG Control"
        if "goblin-drill" in slugs:
            return "Drill Control"
        return "Midrange Control"

    def _default_tags(self, cards: list[dict], source_type: str, popularity: int = 0) -> list[str]:
        tags = []
        avg_elixir = self._average_elixir(cards)
        slugs = {card.get("slug") for card in cards}

        if source_type == "top_player":
            tags.extend(["top player", "ladder-safe"])
        elif source_type == "popular":
            tags.extend(["popular", "meta"])
        elif source_type == "reference_meta":
            tags.append("meta")

        if popularity >= 2 and "popular" not in tags:
            tags.append("popular")

        if avg_elixir >= 4.8:
            tags.append("risky")
        elif avg_elixir <= 4.2:
            tags.append("ladder-safe")

        win_condition_count = len([slug for slug in slugs if slug in WIN_CONDITION_SLUGS])
        if win_condition_count == 0:
            tags.append("strong but flawed")
        elif win_condition_count > 2:
            tags.append("risky")

        deduped = []
        seen = set()
        for tag in tags:
            clean = str(tag).strip().lower()
            if not clean or clean in seen:
                continue
            seen.add(clean)
            deduped.append(clean)
        return deduped

    def _build_deck(
        self,
        name: str,
        cards: list[dict],
        source: str,
        source_type: str,
        player_name: str = "",
        notes: str = "",
        tags: list[str] | None = None,
        popularity: int = 0,
        reference_url: str = "",
        deck_id: str | None = None,
    ) -> dict:
        signature = self._deck_signature(cards)
        digest = hashlib.sha1(f"{source_type}:{signature}".encode("utf-8")).hexdigest()[:12]
        created = utc_now_iso()

        final_tags = tags[:] if isinstance(tags, list) else []
        auto_tags = self._default_tags(cards, source_type, popularity)
        for tag in auto_tags:
            if tag not in final_tags:
                final_tags.append(tag)

        return {
            "id": deck_id or f"{source_type}-{digest}",
            "name": name,
            "cards": cards,
            "archetype": self._infer_archetype(cards),
            "averageElixir": self._average_elixir(cards),
            "source": source,
            "sourceType": source_type,
            "sourceUrl": reference_url,
            "playerName": player_name or None,
            "popularity": popularity,
            "tags": final_tags,
            "notes": notes,
            "createdAt": created,
            "updatedAt": created,
        }

    def _fetch_top_players(self, token: str) -> list[dict]:
        if not token:
            return []

        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
        }
        url = f"{CLASH_API_BASE}/locations/global/rankings/players?limit={self.top_players_limit}"

        try:
            response = requests.get(url, headers=headers, timeout=self.timeout_seconds)
        except requests.Timeout as exc:
            raise DeckExplorerError("Deck explorer sync timed out.", 504) from exc
        except requests.RequestException as exc:
            raise DeckExplorerError("Deck explorer could not reach Clash Royale API.", 502) from exc

        if response.status_code in (401, 403):
            raise DeckExplorerError("Deck explorer token is not authorized.", 502)
        if response.status_code == 429:
            raise DeckExplorerError("Deck explorer is rate limited. Try again soon.", 503)
        if not response.ok:
            raise DeckExplorerError("Deck explorer received an unexpected API response.", 502)

        try:
            payload = response.json()
        except ValueError as exc:
            raise DeckExplorerError("Deck explorer received invalid JSON.", 502) from exc

        items = payload.get("items") if isinstance(payload, dict) else []
        return [item for item in items if isinstance(item, dict)]

    def _build_official_decks(self, token: str) -> tuple[list[dict], list[dict]]:
        players = self._fetch_top_players(token)

        top_player_decks: list[dict] = []
        grouped: dict[str, dict] = {}

        for player in players:
            raw_deck = player.get("currentDeck") or []
            cards = self._normalize_cards(raw_deck)
            if len(cards) != 8:
                continue

            player_name = str(player.get("name") or "Top Player").strip() or "Top Player"
            rank = safe_int(player.get("rank"), 0)
            note = f"Current deck used by top ladder player {player_name}."

            top_player_decks.append(
                self._build_deck(
                    name=f"{player_name} Top Ladder Deck",
                    cards=cards,
                    source="Official Clash Royale API",
                    source_type="top_player",
                    player_name=player_name,
                    notes=note,
                    tags=["top player"],
                    popularity=max(1, rank),
                    reference_url="https://developer.clashroyale.com/#/documentation",
                )
            )

            signature = self._deck_signature(cards)
            bucket = grouped.setdefault(
                signature,
                {
                    "cards": cards,
                    "count": 0,
                    "players": [],
                },
            )
            bucket["count"] += 1
            if player_name not in bucket["players"] and len(bucket["players"]) < 5:
                bucket["players"].append(player_name)

        grouped_items = sorted(grouped.values(), key=lambda item: item["count"], reverse=True)

        popular_decks: list[dict] = []
        for index, item in enumerate(grouped_items[:12]):
            count = safe_int(item.get("count"), 0)
            players_preview = ", ".join(item.get("players") or [])
            note = f"Seen in {count} top-player decks"
            if players_preview:
                note += f" (e.g. {players_preview})."
            else:
                note += "."

            popular_decks.append(
                self._build_deck(
                    name=f"Popular Meta Deck #{index + 1}",
                    cards=item.get("cards") or [],
                    source="Official Clash Royale API",
                    source_type="popular",
                    notes=note,
                    tags=["popular", "meta"],
                    popularity=count,
                    reference_url="https://developer.clashroyale.com/#/documentation",
                )
            )

        return top_player_decks[:20], popular_decks

    def _build_reference_meta_decks(self) -> list[dict]:
        meta_decks: list[dict] = []

        for item in self._reference_decks:
            cards = self._normalize_cards(item.get("cards") or [])
            if len(cards) != 8:
                continue

            deck = self._build_deck(
                name=str(item.get("name") or "Reference Deck"),
                cards=cards,
                source=str(item.get("source") or "Trusted Reference"),
                source_type=str(item.get("sourceType") or "reference_meta"),
                player_name=str(item.get("playerName") or "").strip(),
                notes=str(item.get("notes") or "Reference deck snapshot from trusted source."),
                tags=[str(tag).lower() for tag in (item.get("tags") or []) if str(tag).strip()],
                popularity=safe_int(item.get("popularity"), 0),
                reference_url=str(item.get("referenceUrl") or ""),
                deck_id=str(item.get("id") or "").strip() or None,
            )

            explicit_archetype = str(item.get("archetype") or "").strip()
            if explicit_archetype:
                deck["archetype"] = explicit_archetype

            meta_decks.append(deck)

        return meta_decks

    def build_deck_database(self, token: str | None, force_refresh: bool = False) -> dict[str, Any]:
        now = time.time()
        if not force_refresh and self._cached_payload and (now - self._cached_at) < self.cache_seconds:
            payload = self._clone(self._cached_payload)
            payload.setdefault("meta", {})["fromCache"] = True
            payload["meta"]["cacheAgeSeconds"] = self.cache_age_seconds()
            return payload

        errors: list[str] = []
        top_player_decks: list[dict] = []
        popular_decks: list[dict] = []

        if token:
            try:
                top_player_decks, popular_decks = self._build_official_decks(token)
            except DeckExplorerError as exc:
                errors.append(exc.message)
                self._last_error = exc.message
        else:
            errors.append("CR_API_TOKEN is missing, so official top-ladder sync is unavailable.")
            self._last_error = "CR_API_TOKEN is missing"

        meta_decks = self._build_reference_meta_decks()

        all_decks = []
        seen = set()
        for group in (top_player_decks, popular_decks, meta_decks):
            for deck in group:
                deck_id = str(deck.get("id") or "")
                if not deck_id or deck_id in seen:
                    continue
                seen.add(deck_id)
                all_decks.append(deck)

        synced_at = utc_now_iso()
        payload = {
            "decks": all_decks,
            "sections": {
                "topPlayerDecks": top_player_decks,
                "popularDecks": popular_decks,
                "metaDecks": meta_decks,
            },
            "meta": {
                "syncedAt": synced_at,
                "fromCache": False,
                "cacheAgeSeconds": 0,
                "cacheTtlSeconds": self.cache_seconds,
                "hasOfficialData": bool(top_player_decks or popular_decks),
                "counts": {
                    "total": len(all_decks),
                    "topPlayer": len(top_player_decks),
                    "popular": len(popular_decks),
                    "meta": len(meta_decks),
                },
                "sources": self._reference_sources,
                "errors": errors,
            },
        }

        self._cached_payload = self._clone(payload)
        self._cached_at = now
        self._last_sync_at = synced_at
        if not errors:
            self._last_error = ""

        return payload
