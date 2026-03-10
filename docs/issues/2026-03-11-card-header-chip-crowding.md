# Issue: Card Header Chip Crowding in Catalog Cards

- Type: UI bug
- Area: Card catalog grid (`.card-item`)
- Reported: 2026-03-11
- Status: Fixed

## Problem
Long card names plus many chips (variant/rarity/level) were competing in the same horizontal row, making headers look cramped and uneven.

## Impact
- Harder to scan card names quickly
- Visual imbalance across cards in the same row
- Cards looked inconsistent/premium quality dropped

## Root Cause
`.card-title-row` used a horizontal flex layout with `space-between`, forcing title and chips into the same line budget.

## Fix Applied
- Switched `.card-title-row` to a stacked grid layout
- Kept card name line-clamped to avoid overflow
- Left-aligned chip wrap for cleaner readability
- Tightened card spacing by removing extra forced minimum height

## Files Changed
- `styles.css`

