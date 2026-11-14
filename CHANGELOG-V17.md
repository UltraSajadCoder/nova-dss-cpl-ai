# V17 — Modal Scrolling, Danger Buttons & Profile Menu

## Changes
- Removed the nested scroll area inside the About Nova-DSS dialog. The dialog now owns the single vertical scrollbar.
- Forced white text on red/danger action buttons in normal, hover, focus, and active states.
- Changed the profile indicator to vertical dots (⋮) and centered it against the username row.
- Hardened Settings and Account menu click handling against event bubbling and touch/click quirks.

## Files changed
- `public/index.html`
- Added `CHANGELOG-V17.md`

## Preserved
All other V16 project files, supplied profile icons, and existing app features are retained.
