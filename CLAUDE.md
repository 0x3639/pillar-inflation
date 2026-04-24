# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A simulator for Zenon Network pillar accumulation — specifically whether a single operator (Zenon.org) can, over time, use compounding ZNN rewards and the ZNN→QSR swap market to accumulate enough pillars to dominate the top-30 producer set or gain majority governance weight. Two coupled deliverables:

1. **Python simulator** (`python/`) — reference/authoritative model. Pure functions, dataclass-based, tested. Emits golden JSON fixtures.
2. **React web app** (`web/`) — interactive UI deployed to `https://0x3639.github.io/pillar-inflation/`. TypeScript port of the engine, kept byte-equal to Python via fixture-parity tests.

The authoritative spec is [`MODEL.md`](MODEL.md) — read it before changing the engine or reward math. It covers facts (from `go-zenon`), the model as implemented, assumptions, and every parameter.

## Common commands

```bash
# Python (from repo root)
python3 -m venv .venv && .venv/bin/pip install -e "python[dev]"
.venv/bin/pytest python                 # run test suite
.venv/bin/pillar-sim baseline           # reproduce 5/8/12/17 baseline table
.venv/bin/pillar-sim sweep              # default (LockThreshold) sweep
.venv/bin/pillar-sim emit-fixtures      # regenerate shared/fixtures/*.json
.venv/bin/pillar-sim plot               # matplotlib PNGs → python/out/

# Web (from web/)
npm install
npm run dev        # local dev at http://localhost:5173/pillar-inflation/
npm test           # vitest parity check against shared/fixtures/
npm run build      # production build to dist/
npm run typecheck  # tsc --noEmit
```

## Architecture

The Python and TS codebases mirror each other 1:1. Each has:

- `params` — frozen dataclass / immutable interface with every tunable knob. Single source of truth.
- `state` — `OperatorState`, `NetworkState` (split into `competitor_top30` and `competitor_bottom`), `MonthRecord`.
- `rewards` — derived per-pillar daily producing rate + delegation-pool rate + operator/delegator split.
- `strategy` — pluggable `Strategy` protocol. Two implementations ship:
  - `LockThresholdStrategy` (default) — monthly tick; accumulate ZNN until balance ≥ `znn_lock_per_pillar`, then sell surplus for QSR. Launch whenever affordable. Promote bottom→top30 at year-end if enabled.
  - `SellAllYearlyStrategy` — yearly tick; find max feasible launches, lock + sell + burn. Used only to verify the 5/8/12/17 baseline table.
- `engine.simulate(params, strategy)` — pure, returns `list[MonthRecord]`. Engine owns the monthly tick, reward accrual, invariants, and whole-pillar network growth; strategies own behavioral choices.

### Non-obvious invariants

- **ZNN locked for a pillar is recoverable; QSR spent is burned.** Never treat them symmetrically.
- **The 15,000 ZNN lock is stake, not delegation.** Bottom pillars default to 0 delegation (`pillar_total_delegation_bottom = 0`). Don't conflate launch stake with delegation weight.
- **`PER_TOP30_DAILY` (producing) is fixed per slot, not per pillar.** Only `PER_BOTTOM_DAILY` dilutes. With `dilute_bottom_rewards=True` (default), the bottom pool is divided by the live count of bottom pillars on the network (operator + competitors).
- **Network total delegation is dynamic.** Computed each month as `total_top30 × network_avg_top30_delegation + total_bottom × network_avg_bottom_delegation`. Adding bottom pillars grows the denominator when `network_avg_bottom_delegation > 0`.
- **Delegation reward is additive.** `include_delegation_reward=True` (default) adds the 24% pool share on top of producing rewards. The baseline test explicitly disables it so the 5/8/12/17 numbers reproduce.
- **Operator/delegator split** (`give_momentum_reward_pct`, `give_delegation_reward_pct`) reduces operator take, partially offset by `self_share = self_delegation / total_delegation`. Defaults 55 / 100 match the Zenon.org pillar dashboard.
- **Launch cost escalates per-launch, not per-year.** `next_qsr_cost += qsr_cost_step` after each launch. If two launches happen in one month, the second costs more.
- **Network growth quantizes to whole pillars.** `network_growth_per_year / 12` accumulates; when the accumulator crosses 1, a whole pillar spawns. `competitor_bottom` is always an integer.
- **Top-30 cap is `operator_max_top30`, not `top30_slots`.** Default 30 = full takeover possible; lower to model unshakeable competitors.

### Parity enforcement

`shared/fixtures/*.json` are the drift gate: Python emits them via `pillar-sim emit-fixtures`; vitest loads each and asserts the TS `simulate()` returns `MonthRecord[]` equal to 6 decimal places on floats, exact on ints. CI fails if fixtures drift from the committed copy — always regenerate and commit after changing params, state shape, or reward logic.

## Deployment

GitHub Pages via Actions (not `gh-pages` branch). `.github/workflows/deploy-pages.yml` builds `web/` and pushes to the `github-pages` environment on every push to `main`. `vite.config.ts` sets `base: '/pillar-inflation/'`.
