# V16 — Profile Menu & Drawer Interaction Fix

## Changes
- Replaced the profile chevron with a centered three-dot indicator.
- Avatar now displays the first alphabetic character in the username. If no letter exists, it displays the first digit; otherwise it falls back to the first character.
- Replaced the Settings, Account, and Sign out symbols with the three supplied custom PNG icons.
- Custom icons use CSS masking and the active accent color, so they follow the selected theme.
- Settings and Account dialogs open above the navigation drawer without closing the drawer.
- The small profile popup closes after selection; the main sidebar drawer remains open.

## Files changed
- `public/index.html`
- Added `public/profile-icons/setting.png`
- Added `public/profile-icons/account.png`
- Added `public/profile-icons/exit.png`

All other V15 project files and existing features are retained.
