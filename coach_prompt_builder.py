"""Prompt builder for Clash Royale coach context injection."""

from __future__ import annotations

import re
from typing import Any

_DISPLAY_LIST_LIMIT = 160


def _clip_text(value: Any, max_len: int = 220) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    return text[:max_len]


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalize_deck_cards(raw_cards: Any) -> list[dict]:
    if not isinstance(raw_cards, list):
        return []

    cards: list[dict] = []
    for raw in raw_cards[:8]:
        if isinstance(raw, str):
            name = _clip_text(raw, 80)
            if not name:
                continue
            cards.append({"name": name, "level": 0, "variant": ""})
            continue

        if not isinstance(raw, dict):
            continue

        name = _clip_text(raw.get("name"), 80)
        if not name:
            continue

        cards.append(
            {
                "name": name,
                "level": _safe_int(raw.get("level"), 0),
                "variant": _clip_text(raw.get("variant"), 20).lower(),
                "evolutionLevel": _safe_int(raw.get("evolutionLevel"), 0),
            }
        )

    return cards


def _normalize_owned_cards(raw_cards: Any) -> list[dict]:
    if not isinstance(raw_cards, list):
        return []

    cards: list[dict] = []
    for raw in raw_cards[:240]:
        if not isinstance(raw, dict):
            continue

        name = _clip_text(raw.get("name"), 80)
        if not name:
            continue

        cards.append(
            {
                "name": name,
                "level": _safe_int(raw.get("level"), 0),
                "maxLevel": _safe_int(raw.get("maxLevel"), 0),
                "count": _safe_int(raw.get("count"), 0),
                "evolutionLevel": _safe_int(raw.get("evolutionLevel"), 0),
                "variant": _clip_text(raw.get("variant"), 20).lower(),
                "hasEvoVariant": bool(raw.get("hasEvoVariant")),
                "hasHeroVariant": bool(raw.get("hasHeroVariant")),
            }
        )

    cards.sort(key=lambda item: (-item["level"], item["name"].lower()))
    return cards[:_DISPLAY_LIST_LIMIT]


def _format_deck(cards: list[dict]) -> str:
    if not cards:
        return "- Not provided"

    lines: list[str] = []
    for index, card in enumerate(cards, start=1):
        bits = [card.get("name", "Unknown")]
        level = _safe_int(card.get("level"), 0)
        if level > 0:
            bits.append(f"L{level}")

        variant = str(card.get("variant") or "").strip().lower()
        evo_level = _safe_int(card.get("evolutionLevel"), 0)
        if variant == "evolution":
            bits.append("Evo")
            if evo_level > 0:
                bits.append(f"Evo{evo_level}")
        elif variant == "hero":
            bits.append("Hero")

        lines.append(f"{index}. {' • '.join(bits)}")

    return "\n".join(lines)


def _format_owned_cards(cards: list[dict]) -> str:
    if not cards:
        return "- Not provided"

    lines: list[str] = []
    for index, card in enumerate(cards, start=1):
        name = card.get("name", "Unknown")
        level = _safe_int(card.get("level"), 0)
        max_level = _safe_int(card.get("maxLevel"), 0)
        count = _safe_int(card.get("count"), 0)
        evo_level = _safe_int(card.get("evolutionLevel"), 0)

        tags: list[str] = []
        if bool(card.get("hasEvoVariant")):
            tags.append("Evo Available")
        if bool(card.get("hasHeroVariant")):
            tags.append("Hero Available")
        if evo_level > 0:
            tags.append(f"Evo Unlocked {evo_level}")
        if max_level > 0:
            tags.append(f"Max {max_level}")
        if count > 0:
            tags.append(f"Count {count}")

        suffix = f" ({', '.join(tags)})" if tags else ""
        lines.append(f"{index}. {name} - L{level}{suffix}")

    return "\n".join(lines)


def _format_optional_deck(value: Any) -> str:
    cards = _normalize_deck_cards(value)
    return _format_deck(cards)


def sanitize_player_context(raw: Any) -> dict:
    payload = raw if isinstance(raw, dict) else {}

    return {
        "playerName": _clip_text(payload.get("playerName"), 120) or "Unknown",
        "playerTag": _clip_text(payload.get("playerTag"), 24) or "Unknown",
        "trophies": _safe_int(payload.get("trophies"), 0),
        "arena": _clip_text(payload.get("arena"), 120) or "Unknown",
        "preferredPlaystyle": _clip_text(payload.get("preferredPlaystyle"), 60) or "no_preference",
        "currentDeck": _normalize_deck_cards(payload.get("currentDeck")),
        "ownedCards": _normalize_owned_cards(payload.get("ownedCards")),
        "favoriteDeck": payload.get("favoriteDeck"),
        "lastSuggestedDeck": payload.get("lastSuggestedDeck"),
        "pinnedDeck": payload.get("pinnedDeck"),
        "struggleDecks": payload.get("struggleDecks"),
        "extraNotes": _clip_text(payload.get("extraNotes"), 800) or "Not provided",
        "collectionStatus": _clip_text(payload.get("collectionStatus"), 120) or "unknown",
        "deckExplorerSummary": _clip_text(payload.get("deckExplorerSummary"), 280) or "Not provided",
        "gameFactsVerifiedAt": _clip_text(payload.get("gameFactsVerifiedAt"), 40) or "unknown",
        "gameFacts": _clip_text(payload.get("gameFacts"), 1600) or "Not provided",
    }


def _format_struggles(raw: Any) -> str:
    if isinstance(raw, list):
        cleaned = [_clip_text(item, 80) for item in raw]
        cleaned = [item for item in cleaned if item]
        return ", ".join(cleaned) if cleaned else "Not provided"

    value = _clip_text(raw, 300)
    return value or "Not provided"


def build_clash_royale_prompt(player_context: dict, user_message: str) -> str:
    """Build one reusable prompt block with live site context + user message."""
    context = sanitize_player_context(player_context)

    current_deck = _format_deck(context["currentDeck"])
    owned_cards = _format_owned_cards(context["ownedCards"])
    favorite_deck = _format_optional_deck(context.get("favoriteDeck"))
    last_suggested_deck = _format_optional_deck(context.get("lastSuggestedDeck"))
    pinned_deck = _format_optional_deck(context.get("pinnedDeck"))
    struggle_decks = _format_struggles(context.get("struggleDecks"))
    clean_message = _clip_text(user_message, 2000) or "No user request provided."

    return "\n".join(
        [
            "Player Context:",
            f"- Player Name: {context['playerName']}",
            f"- Player Tag: {context['playerTag']}",
            f"- Trophies: {context['trophies']}",
            f"- Arena: {context['arena']}",
            f"- Preferred Playstyle: {context['preferredPlaystyle']}",
            f"- Collection Status: {context['collectionStatus']}",
            f"- Deck Explorer Snapshot: {context['deckExplorerSummary']}",
            "",
            "Current Deck:",
            current_deck,
            "",
            "Owned Cards and Levels:",
            owned_cards,
            "",
            "Optional Extra Context:",
            "- Favorite Deck:",
            favorite_deck,
            "- Last Suggested Deck:",
            last_suggested_deck,
            "- Pinned Deck:",
            pinned_deck,
            f"- Decks User Struggles Against: {struggle_decks}",
            f"- Notes: {context['extraNotes']}",
            "",
            "Live Game Snapshot (Most Recent Verified):",
            f"- Verified At: {context['gameFactsVerifiedAt']}",
            f"- Facts: {context['gameFacts']}",
            "",
            "User Request:",
            clean_message,
            "",
            "Response Rules For This Request:",
            "- If this is a general Clash Royale question, answer directly without requiring collection data.",
            "- Only enforce owned-card restrictions when recommending specific deck/card changes.",
        ]
    )
