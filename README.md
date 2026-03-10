# Clash Royale Deck Forge (Full-Stack)

This project now uses a secure backend route to fetch player data from the **official Clash Royale API** and display profile + owned card levels on the website.

## What Was Added

- Server-side API route: `GET /api/player/<player_tag>`
- Frontend player tag input + `Fetch My Cards` flow
- Profile UI (name, tag, trophies, best trophies, arena)
- Owned cards UI (image, level, max level, count, evo level)
- Owned card search/filter
- Loading + safe error states
- Optional raw response save for local debugging
- Deck-analysis stub function: `analyzeBestDeck(cards, trophies)`

## File Map

Place/use files in this project directory:

- `server.py`: backend server + secure Clash API route
- `requirements.txt`: Python dependencies
- `.env.example`: environment variables template
- `index.html`: updated UI (profile + owned cards panel)
- `app.js`: frontend logic + rendering + deck stub
- `styles.css`: responsive profile/cards styles

## Environment Variables

Copy the example file and set your token:

```bash
cd /Users/mn9xr/clash-royale-deck-builder
cp .env.example .env
```

Edit `.env` and set:

```env
CR_API_TOKEN=your_official_clash_royale_api_token_here
CR_API_TIMEOUT_SECONDS=10
CR_SAVE_RAW_RESPONSE=0
PORT=8080
```

## Install Dependencies

```bash
cd /Users/mn9xr/clash-royale-deck-builder
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run Locally

```bash
cd /Users/mn9xr/clash-royale-deck-builder
source .venv/bin/activate
python3 server.py
```

Open:

- `http://127.0.0.1:8080`

## Frontend Flow

1. Enter player tag (example: `#ABCD123`)
2. Click `Fetch My Cards`
3. Frontend calls backend route `/api/player/<tag>`
4. Backend calls official API using `CR_API_TOKEN`
5. Frontend renders profile + owned cards

## Backend Security Notes

- Token is server-side only (`CR_API_TOKEN`)
- Token is never sent to the browser
- Player tags are sanitized/validated on server
- Requests use timeout handling
- Safe error messages returned to frontend

## Optional Raw Response Debug Save

Set:

```env
CR_SAVE_RAW_RESPONSE=1
```

Then each request can save raw JSON to `debug_raw/`.

You can also trigger per request by adding query:

- `/api/player/ABC123?debug=1`

## API Response Shape (to frontend)

```json
{
  "player": {
    "name": "...",
    "tag": "#...",
    "trophies": 0,
    "bestTrophies": 0,
    "arena": "...",
    "arenaId": 0
  },
  "cards": [
    {
      "id": 26000000,
      "name": "Knight",
      "level": 14,
      "maxLevel": 14,
      "count": 1234,
      "evolutionLevel": 0,
      "iconUrl": "https://..."
    }
  ],
  "meta": {
    "cardCount": 121,
    "rawSavedPath": null
  }
}
```

Cards are sorted by:

1. highest level first
2. name ascending

## Deck Builder Stub

`app.js` includes:

- `analyzeBestDeck(cards, trophies)`

This is intentionally a structured stub, ready for future deck-ranking logic.
