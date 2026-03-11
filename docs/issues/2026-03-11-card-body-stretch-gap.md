# Issue: Catalog Card Body Stretching and Awkward Role-Tag Spacing

- Type: UI bug
- Area: Card catalog card layout (`.card-item`)
- Reported: 2026-03-11
- Status: Fixed

## Problem
Some cards showed excessive empty vertical space between role tags and the action button, making card bodies look stretched and unbalanced.

## Visual Symptom
- Role chips looked oversized/isolated in the middle of the card
- Action button felt detached from card content
- Grid looked uneven and "nasty" despite same card widths

## Root Cause
Card internals were constrained in a way that produced awkward vertical distribution for cards with short metadata/role lists.

## Fix Applied
- Kept card internals as flex-column for more natural vertical flow
- Anchored card CTA with `margin-top: auto` to stabilize bottom alignment
- Tightened role-tag line-height/padding and set `align-content: flex-start`
- Added a small minimum role-tags zone to reduce visual jumpiness

## Files Changed
- `styles.css`

