# SQUEEK KINGDOM

**BUILD YOUR EMPIRE. RACE WITH THE HAMSTER. SURVIVE THE ROUNDS.**

An original, playable hamster strategy game for the SqueekChain ecosystem. The export is in **`dist/`**. Serve that directory with any static web host; asset paths are relative and navigation uses URL hashes, so it also works under a gateway subpath. Publishing is handled by the assignment’s hosting plane.

## Install, play and rebuild

Use Node.js **24 or newer** and npm.

```sh
npm ci
npm run dev
```

For the production application:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` regenerates `dist/index.html` and all required assets. `npm run preview` serves the finished export. No environment file, API key, wallet project ID, backend, or vendored package registry is needed. Keep `dist/` in the submission; it is intentionally not ignored.

## Play the game

- Choose Miner, Warrior, Engineer or Explorer through **Change hero**. Each class has a working perk; changing class is free.
- Gather wood, stone and food every eight seconds. Build a crystal mine for stone, gold and crystals, and a workshop for crafting. Castle upgrades raise the other buildings’ level cap. Laboratory, arena and farm upgrades have their own effects.
- The kingdom produces resources every 15 seconds. Returning players receive at most four hours of offline production. Counts display whole units while fractional Miner production accumulates internally.
- Craft planks, copper gears, potions and armor. Planks improve future gathers; gears improve a race; armor and potions help on missions.
- Complete three-stage Mosswood explorations or defend against three beetle waves. Resource spending, health, retreat and failure are functional. Claim quests for resources and XP. Every 100 XP raises your kingdom level; six achievements track real milestones.
- Race a local computer rival in a 20-second sprint. Use up to three pace boosts and an optional crafted gear. An upgraded arena improves your pace.
- Progress saves in the current browser where storage is available. **How to play** includes JSON export/import. Invalid imports preserve the current game. If storage is blocked, play continues in memory and the game recommends exporting a backup.

This is single-player. Every game resource, reward, achievement and XP value is local game state with no monetary value. There is no multiplayer service, trade, betting, payment, invented token, or transaction flow. World artwork and local rivals are game simulations, explicitly separate from external measurements. Sound effects are original Web Audio synthesis and start only after the sound control is enabled.

## Genuine SqueekChain integration

The official [API reference](https://docs.squeekchain.com/developers/api/) was read before implementation. The game calls only documented read endpoints at `https://api.squeekchain.com/v1`:

| Endpoint | Use |
| --- | --- |
| `/status` | Device observations, freshness, provenance, cumulative passage counter and provisional open-round work |
| `/core` | Sepolia identity, safe block, genesis timestamp, 600-second duration and settled frontier |

Consumed fields and schema versions are validated in `src/integration/api.ts`. Unsupported, malformed, stale, simulated, unavailable, or unhealthy inputs do not become zero-valued “live” data. HTTP errors and outages leave local play available. Requests have timeouts; `Retry-After` on 429/503 responses prevents early network retries. Polling normally runs every 15/30 seconds, with measurement polling every two seconds during races.

A **wheel challenge** compares game pace against the difference between actual hardware counter observations sampled around a 20-second race. It does not infer settled work from RPM, and a zero counter difference stays zero. The race records the current round derived from the API’s genesis and 600-second duration. A win can register a **10 game crystal** bonus; it is credited once the same installation and core identity report that round settled. Only one bonus can be pending at a time, and each core/round can pay once per save. Settlement can lag the round’s wall-clock end. A measurement failure or counter-epoch/deployment change converts the attempt explicitly to local practice.

The signal section labels **live measurement**, **provisional activity** and **settled on Sepolia** separately. Its detail dialog explains the evidence and links to the official documentation.

## Wallets, ownership and optional cosmetics

The chain is **Ethereum Sepolia, 11155111**. `src/integration/chain.ts` uses wagmi with EIP-6963 discovery, an injected fallback and Coinbase Wallet/Smart Wallet. One sheet supports connection, reconnect, explicit network switching and disconnect. Phone browsers offer MetaMask, Coinbase Wallet, Rabby and Phantom browser-opening links. There is no WalletConnect relay or project ID. Rabby’s link format was checked against its [official mobile link handler](https://github.com/RabbyHub/rabby-mobile/blob/develop/apps/mobile/src/hooks/universalLink.ts).

The NFT section uses the official [published deployment record](https://docs.squeekchain.com/assets/deployments/sepolia.json), [SqueekNFT reference](https://docs.squeekchain.com/developers/nft/) and [complete official ABI](https://docs.squeekchain.com/assets/abi/SqueekNFT.json), retained under `src/integration/`.

The published NFT address is **`0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6`**. Reads check Sepolia, deployed code, collection name, and the official `mining()` / `sqkCore()` bindings at a block 12 behind the tip. Ownership uses actual `balanceOf` and `ownerOf` calls. Incoming `Transfer` events discover candidates, whose current ownership is rechecked. If RPC log access is unavailable, token scanning and known-ID lookup provide alternatives.

Images, names and traits come from the contract’s base64 `tokenURI`; no placeholder NFTs or guessed traits are displayed. Portraits load eight at a time. Applying one rechecks ownership at a new confirmed block. Disconnecting or changing accounts clears it. Wallet-held Squeeks qualify; deposited/staked NFTs are not treated as wallet-held. An NFT unlocks the ability to use its verified image as this game’s portrait, without stat bonuses or a claim of official NFT benefits. Guest play uses original hamster art.

**Deployment limitation:** the live measurement API currently reports a core deployment different from the published NFT record. The game exposes that distinction and does not use the API’s account index to prove ownership of the published collection. Future maintainers should refresh the official record and ABI together, rather than copying API addresses into the NFT configuration.

Connecting requests account access only. The application never requests keys or recovery phrases, automatically signs anything, submits transactions, approves NFTs, or handles funds. Browser wallet permissions remain managed by the wallet after the app disconnects.

## Validation

Actual worker results, six-domain design coverage, source locations, fixes and remaining limitations are in **[artifacts/validation.md](artifacts/validation.md)**. The implemented design system is in **[DESIGN.md](DESIGN.md)**. The submission budget and ignore scope are in **[artifacts/submission-budget.md](artifacts/submission-budget.md)**.

Reproducible checks:

```sh
npm test
npx playwright install chromium webkit
npm run test:browser
SQUEEK_BROWSER=webkit npm run test:browser
npm run test:accessibility
npm run test:web3
npm run test:live
```

Browser checks serve `dist/` under `/preview/` in a bounded local test server, then close it. They write disposable results to `test/scratch/`. `test:web3` uses an explicitly mocked EIP-6963 provider with the **public reserve address from the official deployment record**, solely to exercise read-only ownership UI against real RPC data; this does not demonstrate control of that wallet. No test signs or submits a transaction. `test:live` needs the official API, runs one real 20-second race, and can fail when fresh hardware data is unavailable. The core tests work offline and do not require a browser.

For contributor workers that keep dependencies outside the repository, Vite accepts `SQUEEK_DEPS_DIR` and browser checks accept `SQUEEK_CHECKS_DIR`, pointing to a task-owned installation directory. Ordinary installs need neither setting. The worker used that arrangement to keep dependency and browser directories out of this submission.

The worker’s checks are self-reported evidence, not independent certification. Chromium and WebKit were both exercised. Physical wallet apps, passkey enrollment, screen readers, and an actual transaction were not exercised; the application intentionally has no transaction feature.

## Source map and attribution

- `src/game/engine.ts`: pure progression, production, missions, quests, inventory, saves and round rewards.
- `src/game/art.ts`: original pixel terrain, structures, hamster sprites and map drawing.
- `src/components/`: world, wallet, collection, race, signal and native dialog UI.
- `src/integration/`: documented API readers, public RPC configuration, official deployment and ABI.
- `tests/`: offline rules tests and browser interaction checks.
- `public/`: original favicon/share artwork and wallet marks.
- `dist/`: complete static export, including required runtime assets.

Original game artwork, world animations and synthesized sounds were created for this assignment. DM Sans and Pixelify Sans use the SIL Open Font License; their licenses are retained in `artifacts/licenses/`. Wallet marks are from RainbowKit’s upstream wallet assets; the Coinbase mark was supplied in the pinned connector reference. Design knowledge was adapted from Jakub Krehel’s Better Interface (MIT) and Paul Bakaus’s Impeccable documentation guidance (Apache-2.0), with supplied notices retained in `artifacts/licenses/Better-Interface.txt`.
