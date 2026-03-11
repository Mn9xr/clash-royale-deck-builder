# Clash Royale Deck Forge

Local full-stack Clash Royale deck coach web app with secure server routes, player collection fetch, deck coaching, deck explorer, and status tracking.

Project owner and creator: `Mn9xr`.

## What is implemented

- Secure player collection fetch from official Clash Royale API (`CR_API_TOKEN` stays server-side)
- Owned card + level viewer (with evo level support)
- Deck builder, analyzer, upgrade advice, pin/share, and history
- Ollama-powered conversational deck coach (normal text + live player/card/deck context injection, follow-up memory, typing state, suggestion chips)
- Deck explorer database with normalized schema and source attribution:
  - Top player decks (official API)
  - Popular decks aggregated from top-player snapshot
  - Trusted reference meta deck snapshot (`deck_reference_data.json`)
- Live status tracker:
  - player API health
  - deck sync health
  - chatbot heartbeat
  - recent activity log
- Premium interactive UI:
  - cursor-reactive tilt/parallax/spotlight (desktop)
  - reduced-motion and touch-safe fallbacks
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
- `GET /api/decks/explorer?refresh=1`
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
