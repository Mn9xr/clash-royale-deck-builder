# Clash Royale Deck Forge

Local full-stack Clash Royale deck coach web app with secure server routes, player collection fetch, deck coaching, deck explorer, and status tracking.

Project owner and creator: `Mn9xr`.

## What is implemented

- Secure player collection fetch from official Clash Royale API (`CR_API_TOKEN` stays server-side)
- Player profile + owned card tracking with level/evolution awareness
- Unified card catalog (base/evolution/hero in one list) with:
  - search bar above filters
  - role/type filters
  - quick filters (underleveled, deck-core, highest-level, missing evo)
- Premium deck builder workflow:
  - deck slots styled to match catalog cards
  - card-art backgrounds and variant visuals (hero/evolution FX)
  - rarity styling (including legendary treatment)
  - randomize / clear / pin-current actions
  - deck history and pinned deck summary/share
- Deck legality rules:
  - max `1` hero/champion card per deck
  - max `2` evolution cards per deck
- Deck Health panel (premium UI) with:
  - live score badge
  - strong/watch/fix status chips
  - role coverage + curve + level checks
- Battle Log Analytics from recent 1v1 data:
  - win rate
  - crown averages
  - archetype usage
  - loss patterns
- Smart Suggestions (non-random):
  - role-gap scoring
  - reason text on each suggestion
  - direct swap suggestions when deck is full
- One-Tap modes:
  - Best Deck For Pushing
  - Safest Deck
  - Most Aggressive Deck
  - Best Upgrade Path
  - Analyze My Current Deck
- Better upgrade-path logic:
  - prioritizes highest-impact cards first
  - excludes maxed cards from upgrade recommendations
- Ollama-powered deck coach:
  - live player/card/deck/explorer context injection
  - follow-up memory and typing-state UX
  - improved fallback behavior for simple Q&A
  - Clash Royale arena reference context + owner identity context (`Mn9xr`)
- Deck Explorer with normalized source attribution and UI controls:
  - top player decks (official API)
  - popular decks aggregated from top-ladder snapshot
  - trusted reference meta decks (`deck_reference_data.json`)
  - search / archetype / source / label filters
  - favorites
  - deck details modal
  - one-click load into builder
- Live status tracker with activity feed:
  - player API health
  - deck sync health
  - chatbot heartbeat
  - recent activity log
- Premium interactive UI system:
  - cursor-reactive tilt/parallax/spotlight (desktop)
  - reduced-motion and touch-safe fallbacks
  - visibility-safe motion defaults
- Branding-safe fan project treatment (text-only disclaimer, no official logos/assets bundled)

## Project structure

- `server.py`: Flask API routes and status tracking
- `ollama_service.py`: Ollama API client wrapper with timeout/error handling
- `coach_system_prompt.py`: Clash Royale coach system behavior
- `coach_prompt_builder.py`: prompt/context builder for player/deck/card injection
- `deck_explorer_service.py`: deck-source fetch + normalization + caching
- `deck_reference_data.json`: trusted reference deck snapshot + source attribution
- `app.js`: frontend app logic, explorer rendering, chat routing, deck coaching
- `ui-motion.js`: reusable motion system
- `styles.css`: UI styles + motion/desktop/mobile/reduced-motion
- `index.html`: app layout and panels
- `cards-data.js`: local card dataset (base/evo/hero metadata)
- `local_data/profiles.json`: local runtime storage (history/profile data)

## API routes

- `GET /api/player/<tag>`
- `GET /api/player/<tag>/battlelog`
- `GET /api/decks/explorer?refresh=1`
- `GET /api/cards/icons`
- `GET /api/status`
- `POST /api/status/chatbot-ping`
- `POST /api/chat/coach`
- `GET /api/storage/profiles`
- `GET /api/storage/profile/<tag>`
- `POST /api/storage/profile/<tag>`
- `POST /api/storage/history/<tag>`
- `DELETE /api/storage/history/<tag>`
- `POST /api/storage/pin/<tag>`

## Environment setup

```bash
cd /Users/mn9xr/clash-royale-deck-builder
cp .env.example .env
```

Set `.env` values (minimum required):

```env
CR_API_TOKEN=your_official_clash_royale_api_token_here
PORT=8080
```

Optional values:

- `CR_API_TIMEOUT_SECONDS`
- `CR_SAVE_RAW_RESPONSE`
- `DECK_CACHE_SECONDS`
- `DECK_TOP_PLAYERS_LIMIT`
- `STATUS_STALE_SECONDS`
- `APP_BUILD_LABEL`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT_SECONDS`
- `OLLAMA_SESSION_TTL_SECONDS`
- `OLLAMA_HISTORY_MESSAGES`

## Ollama setup (required for AI coach)

```bash
# Install Ollama from https://ollama.com (one-time)
ollama serve
ollama pull llama3.1:8b
```

If you use a different model, update `OLLAMA_MODEL` in `.env`.

## Install and run locally

```bash
cd /Users/mn9xr/clash-royale-deck-builder
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 server.py
```

Open:

- `http://127.0.0.1:8080`

## Attribution and template use

- If you reuse this project as a template/base, keep credit to `Mn9xr`.
- Keep attribution in both project docs (README or equivalent) and a visible app/site location (footer or About page).
- See [`LICENSE`](LICENSE) for the attribution requirement text.

## Notes

- Do not place `CR_API_TOKEN` in frontend JS.
- Player tags are sanitized server-side and URL encoded for official API calls.
- Deck explorer still works without token using local trusted references, but top-player sync requires `CR_API_TOKEN`.
- This is an unofficial fan project and should keep branding/logo usage conservative.
