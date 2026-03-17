Original prompt: there is a new update to the game , there is now 1 evo slot and 1 hero/champion slot and 1 mixed slot for 2 choices

- Clarification: Deck Slot Rework: 1 Evo, 1 Hero, & 1 Wild Slot.
- Implemented: replaced the old `1 hero/champion + 2 evo` cap check with dedicated evo/hero/wild slot validation.
- Implemented: added a special-slot tracker in the deck panel so the current Evo, Hero, and Wild usage is visible.
- Verified locally in browser:
  - legal `1 evo + 2 hero/champion`
  - legal `2 evo + 1 hero/champion`
  - blocked `4th special` because the Wild slot was already consumed
  - blocked `3rd hero/champion`
- Follow-up: added a tiny inline favicon so the app no longer throws a `favicon.ico` 404 during browser verification.
