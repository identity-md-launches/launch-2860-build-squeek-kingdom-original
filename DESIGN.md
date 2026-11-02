# Squeek Kingdom design system

## Overview

SQUEEK KINGDOM is a playable, single-player hamster strategy game. A parchment interface frames an original isometric woodland island. Tiny geometric sprites, quiet earth colors and a pixel display face give the game its character; readable sans-serif labels keep the controls practical.

The kingdom and its resource economy lead the page. Gathering and construction sit immediately above the interactive world. Adventures, inventory, quests, racing and the optional NFT collection share the header and resource bar. The live signal is subordinate to gameplay.

## Colors

The canonical CSS tokens are in `src/styles.css:13`. Hex is the implementation’s color notation.

| Semantic token | Primitive / value | Role |
| --- | --- | --- |
| `--color-bg` | `--cream-100`, `#f6f3e9` | Page parchment |
| `--color-surface` | `--cream-50`, `#fbf9f2` | Header, dialogs, neutral controls |
| `--color-sunken` | `--cream-200`, `#eee9db` | Quiet control wells and tracks |
| `--color-border` | `--cream-300`, `#dedbcc` | Separators and neutral control outlines |
| `--color-text` | `--ink-800`, `#344238` | Primary text |
| `--color-muted` | `--ink-500`, `#5d6657` | Supporting labels and prose |
| `--color-accent` | `--forest-700`, `#375b42` | Primary actions and interaction emphasis |
| `--color-accent-hover` | `--forest-800`, `#2d4536` | Hovered primary actions |
| `--color-selected` | `--forest-100`, `#e5ecdf` | Chosen hero and positive completion state |
| `--color-error` | `--rust-700`, `#974d35` | Error text |
| `--color-focus` | `#8b4e27` | Visible keyboard focus perimeter |

Supporting game colors include the hero portrait’s oat background `#e8dfc5`, discovery surfaces `#e9ebda` and `#eee6d4`, signal surface `#e8eddf`, XP fill `#8b9d61`, and warm resource/reward browns. Pixel artwork uses its own local palette in `src/game/art.ts`; those colors illustrate terrain, buildings and characters rather than encode control states.

The final contrast probe passes measured solid-background text pairs. Computed rendered ratios include 4.82:1 on the arena discovery surface, 4.96:1 on the adventure discovery surface, 5.03:1 on the signal surface, and 7.28:1 for the primary control. Twelve text boxes over illustrated or gradient surfaces are outside that probe’s automatic contrast coverage; see validation for limitations. Status always includes words or an icon alongside color. World captions and pause controls use solid paper surfaces, and the map footer uses opaque `#accbbc`, so changing artwork cannot sit directly behind those labels.

## Typography

Both fonts are bundled locally under `src/assets/fonts/` and use `font-display: swap`.

- **DM Sans**, `sans-serif` fallback: body, controls, labels and data. Weights 400, 600 and 700.
- **Pixelify Sans**, `sans-serif` fallback: product mark, page titles, game section titles and race clock. Weights 600 and 700, within the loaded 400–700 face range.

The complete scale is `--text-xs: .75rem` (12px), `--text-sm: .875rem` (14px), `--text-base: 1rem` (16px), `--text-md: 1.25rem` (20px), `--text-lg: 1.75rem` (28px), and `--text-xl: 2.25rem` (36px). The root is 16px. Body line height is 1.5; prose is 1.6. Display headings use 1.1–1.2. Small labels retain natural tracking; the main display title uses `-.025em`.

Headings balance their wrapping. Prose uses pretty wrapping. Resource counts, XP and clocks use tabular figures. Inputs stay at 16px on mobile. Wallet/contract addresses wrap fully in detail views; the header’s short address is expanded in the wallet dialog.

## Layout

`src/styles.css` contains the responsive system. Shared spacing values are 4, 8, 12, 16, 24 and 32px, with larger spaces where composition needs them. The main shell is capped at 1440px, with 32px desktop side padding and 12–18px on narrow phones.

- Above 1000px: a single header row; kingdom world plus a 272px quest/hero sidebar, with a 28px gap. Discovery actions form a two-column row.
- At 1250px and below: tighter navigation and a 250px sidebar.
- At 1000px and below: navigation moves to a second header row, the level summary leaves the resource bar, and the sidebar narrows to 232px.
- At 740px and below: the world is a single column; hero and quest summaries form a two-column section beneath it. Inventory and missions stack. Dialogs become full-width bottom sheets.
- At 400px and below: compact navigation labels (“Race”, “NFTs”) keep all six destinations in one row. Header helpers and control padding reduce, while the primary gathering and building controls remain on screen.
- At 350px and below: discovery and sidebar sections stack, and the sound utility leaves the header.

The map retains a 768×500 logical drawing plane, with a modest 768:550 aspect adjustment at intermediate widths. HTML building controls follow proportional plot anchors. Buildings also remain available in the building picker. CSS pixel rendering preserves the original sprite geometry.

Reflow was tested at 320, 390, 740, 1000 and 1440px for all six views. The 390px first screen includes the product, resource HUD, gathering action and interactive kingdom. Native zoom and physical devices are listed separately in validation.

## Elevation & Depth

Most surfaces use tonal separation and spacing. Neutral buttons use an inset one-pixel shadow, while structural separators use borders. Modal dialogs and notifications use soft exterior shadows. The native dialog top layer and its dimmed backdrop establish modal depth; there are no nested elevated card stacks on the main screen.

The world’s terrain sides, buildings and trees provide illustrated depth. Map level markers have a small decorative shadow. NFT image outlines use black at 10% opacity.

## Shapes

Controls use 7–8px corners, world and main view surfaces 10–12px, dialogs 14px, and mobile sheets 16px upper corners. Hero portraits use 10px. Resource icons and artwork retain square pixel geometry. Circles are reserved for signal, quest and achievement markers; the kingdom level badge is an eight-corner shape.

## Components

| Component / source | Use and behavior |
| --- | --- |
| `KingdomMap` / `src/components/KingdomMap.tsx` | Original canvas scene with native HTML plot buttons. Plot names and levels are accessible labels. Hover/focus reveals building names. The picker provides an alternate entry to every structure. |
| `Hamster`, `BuildingArt`, `ResourceIcon` / `src/components/Pixel.tsx` | Reusable local art. Canvas portraits are decorative beside text; NFT portraits use verified onchain images. |
| `.primary`, `.secondary`, `.text-button`, `.icon-button` / `src/styles.css` | Filled action, neutral peer, low-emphasis link-style action, and named icon control. Hover, disabled, pressed and focus states are explicit. |
| `Dialog` / `src/components/Dialog.tsx` | Native `showModal()` dialog, close button, Escape, backdrop dismissal, focus containment and return. `wide` supports hero/build choices; narrow widths use a bottom sheet. |
| `WalletControl` / `src/components/Wallet.tsx` | EIP-6963 names/icons, Coinbase, phone wallet links, per-connection pending state, recoverable rejection text, wrong-chain switching and disconnect. |
| `Signal` / `src/components/Signal.tsx` | Separate live, provisional and settled values. Loading/unavailable states retain their meaning and expose refresh plus source details. |
| `Race` / `src/components/Race.tsx` | Two lanes, a countdown, three boosts and optional gear. Real wheel samples and local rivals are labeled separately; an outage converts the attempt explicitly to practice. |
| Quest rows, recipes, mission choices / `src/App.tsx` | Shared text hierarchy and resource-cost rows, with actual progress, prerequisites, rewards and disabled states. |
| Notifications / `src/App.tsx` | Stable polite status region with dismissal. Successes clear after six seconds; errors remain. Import errors appear inside the active modal. |

Motion is opt-in under `prefers-reduced-motion: no-preference`. Press feedback uses scale `.96`; UI transitions name their properties and last 150ms. World animations can be paused. Reduced motion renders the world still and removes running-sprite hops and transitions; timed game results remain readable as text.

## Do’s and Don’ts

- Start a new game view with the existing `.page-heading`, `.game-page` and `.section-intro` structure.
- Reuse the six-step type scale and the semantic color tokens. Keep narrative flavor in short game titles and make button labels describe their action.
- Keep the resource HUD and primary game action visible. Give every illustrated action a native control and an accessible name.
- Preserve source distinctions: decorative world motion, local computer rivals, fresh hardware observations, provisional activity and settled rounds are different things.
- Keep wallet access optional and read-only. New cosmetics must prove ownership and explain that their benefit belongs to this game.
- Do not add remote fonts, dummy chain values, fake multiplayer, transaction calls, or a marketing hero ahead of the playable world.

Design guidance attribution: Jakub Krehel’s Better Interface (MIT), with documentation guidance adapted from Paul Bakaus’s Impeccable (Apache-2.0), as supplied in the pinned assignment. Full notices are retained in `artifacts/licenses/Better-Interface.txt`.

Final-source note: collection discovery reports the number of owned token IDs verified from transfers; the sequential scan fallback reports only the token IDs it actually scanned. The lookup action keeps its label on one line. The wallet configuration catches denied storage access before initialization so guest play can continue in memory.

Keyboard navigation note: the skip link focuses the active main region without changing the current game route. This preserves the inventory or other selected screen when skipping repeated chrome.
