# Pillar Inflation Simulator

Simulates whether a single operator (Zenon.org) can, over time, accumulate enough Zenon Network pillars to dominate the top-30 producer set or gain majority governance weight on Accelerator-Z.

- **Interactive site:** <https://0x3639.github.io/pillar-inflation/>
- **Authoritative spec:** [`MODEL.md`](MODEL.md) — facts, model, every assumption, full parameter list

## What's in this repo

- `python/` — reference simulator. Pure Python, dataclass-based, pytest-tested. Emits golden JSON fixtures.
- `web/` — React + TypeScript UI (Vite, Recharts). Hand-ported simulator, kept byte-equal to Python via fixture-parity tests.
- `shared/fixtures/` — frozen simulation outputs (one JSON per scenario) that both sides verify against.
- `.github/workflows/` — CI runs pytest, fixture-drift check, TS parity tests, typecheck. Separate workflow deploys the web app to GitHub Pages on every push to `main`.

## Quick start

### Python simulator

```bash
python3 -m venv .venv
.venv/bin/pip install -e "python[dev]"
.venv/bin/pytest python                 # 48 tests, under 0.1s
.venv/bin/pillar-sim baseline           # reproduces spec's 5/8/12/17 launch table
.venv/bin/pillar-sim sweep              # default LockThreshold swap sweep
.venv/bin/pillar-sim plot               # matplotlib PNGs → python/out/
.venv/bin/pillar-sim emit-fixtures      # (re)generate shared/fixtures/*.json
```

### Web app

```bash
cd web
npm install
npm run dev        # http://localhost:5173/pillar-inflation/
npm test           # parity check against shared/fixtures
npm run build      # production bundle → web/dist
```

## Model in one paragraph

Each month, the operator earns ZNN from (a) the producing-reward pool (50% of daily emissions, paid by block-production share) and (b) the delegation-reward pool (24%, paid pro-rata by delegation weight across the whole network). Both are reduced by the operator-to-delegator split (momentum % / delegation %) configured on each pillar. The default "accumulate-then-sell" strategy holds ZNN until it reaches one pillar's lock amount (15,000), then sells the monthly surplus for QSR at the configured swap rate. When QSR reaches the next launch cost (starts at 330,000, escalating +10,000 per launch), 15,000 ZNN is locked and the QSR is burned to spawn a new bottom pillar. Optionally it promotes bottom pillars to top-30 by self-delegating 95,000 additional ZNN per promotion.

Every assumption is exposed as a configurable parameter in the sidebar, and every derived number is shown step-by-step in the on-page audit panel.

## Key findings (current defaults, 10-year horizon)

Defaults reflect the observed Zenon.org configuration:
- Each top-30 pillar: 150,000 ZNN delegated total, 100,000 self-delegated
- Reward split: 55% momentum / 100% delegation given to delegators
- Bottom-pool dilution: on (denominator grows as pillars come online)
- Network delegation: computed dynamically from `top30_slots × 150K + live_bottom × 0`

| Swap rate | Launches | Final total | Final top-30 |
|-----------|----------|-------------|--------------|
| 1:3       | 7        | 13          | 4            |
| 1:5       | 11       | 17          | 4            |
| 1:7       | 15       | 21          | 4            |
| 1:10      | 21       | 27          | 4            |

With promotion enabled (`max_promotions_per_year=2`, `operator_max_top30=30`) at swap 1:10, Zenon.org reaches **12 top-30 pillars — 40% of the producer set** in 10 years.

At default params over 10 years, Zenon.org captures **~6.6% of total ZNN inflation** and **~23.6% of total QSR inflation** (mostly by buying QSR to fund launches).

## Contributing / extending

When changing the engine, follow this loop:

1. Update Python (`python/src/pillar_sim/`).
2. Run `pytest python`.
3. Regenerate fixtures: `pillar-sim emit-fixtures`.
4. Mirror the change in `web/src/sim/` (1:1 with Python).
5. Run `npm test` — if the TS port doesn't match, fix the TS port.
6. Commit fixtures alongside the code change so CI's drift check stays green.
