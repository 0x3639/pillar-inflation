# Pillar Inflation — Model Specification

Authoritative spec for the simulator. Sources consolidated here:
- Original problem framing and the SellAllYearly baseline table (spec's 5/8/12/17 launches at swap 1:3/1:5/1:7/1:10 over 10 years — the verification gate in `python/tests/test_baseline.py`).
- Protocol reward mechanics derived from `go-zenon` (producing + delegation pools, per-momentum rates, operator/delegator split).
- Clarifications recorded during development (operator strategy, reward split, default delegation amounts, whole-pillar network growth).

The simulator in this repo implements the §Model below. §Facts is ground truth from the protocol source code; §Assumptions is what we have explicitly chosen to simplify.

---

## 1. Why this exists

A single operator (Zenon.org) currently runs 4 top-30 pillars and 2 bottom pillars. The question this simulator answers: over time, can compounding ZNN rewards plus the ZNN→QSR swap market allow one entity to accumulate enough pillars to dominate the top-30 producer set or take majority governance weight on Accelerator-Z?

The answer is very sensitive to assumptions. The simulator makes every assumption explicit and configurable.

---

## 2. Facts (from protocol source and public data)

### 2.1 Emissions and pool split

From `vm/constants/embedded.go`:

```
ZNN daily emissions                        4,320 ZNN/day
QSR daily emissions                        5,000 QSR/day
ZNN max supply                            90,071,992
QSR max supply                            90,071,992

Momentum (producing) pool                  50%  → 2,160 ZNN/day
Delegation pool                            24%  → 1,037 ZNN/day
Sentinel pool                              13%  → 562   ZNN/day
Liquidity pool                             13%  → 562   ZNN/day
```

Only the first two pools pay pillars. Sentinel and Liquidity are out of scope.

### 2.2 Producer selection (per round, 1 hour)

From `consensus/election_algorithm.go`, with `NodeCount=30`, `RandCount=15`, `BlockTime=10s`:

1. Sort all pillars by delegation weight → top 30 = groupA, rest = groupB.
2. Randomly pick 15 of groupA as guaranteed producers.
3. Push the other 15 of groupA into groupB.
4. Randomly pick 15 from the enlarged groupB.
5. Each of the 30 producers makes 12 momentums that round. 24 rounds per epoch.

Per-pillar expected momentums/day (assuming 97 pillars: 30 top + 67 bottom):

```
P_top30_per_round  = 15/30 + (15/30) * (15/82) ≈ 0.591
P_bottom_per_round = 15/82                      ≈ 0.183
momentums_top30_per_day  ≈ 170.3
momentums_bottom_per_day ≈  52.7
```

### 2.3 Per-momentum reward and producer reward

```
producing_per_momentum  = 2,160 / 8,640 = 0.25  ZNN
delegation_per_momentum = 1,037 / 8,640 = 0.12  ZNN

top30_daily_producing  = 170.3 * 0.25 ≈ 42.59 ZNN/day   (theoretical max)
bottom_daily_producing =  52.7 * 0.25 ≈ 13.17 ZNN/day
```

The public Zenon calculator shows ~28.34 ZNN/day for top-30, implying ~66% effective uptime (downtime, missed momentums). The simulator uses a derived 28.80 (from `4320 * 0.5 * 0.4 / 30`) that happens to match the calculator within 1.6%.

### 2.4 Delegation reward

```
delegation_reward_for_pillar = delegation_pool_daily * (pillar_delegation_weight / network_total_delegation)
```

Paid proportionally across ALL pillars by delegation weight, not just top-30.

### 2.5 Operator / delegator split

Each pillar has two configurable percentages (0–100%):
- `GiveBlockRewardPercentage` — fraction of momentum reward paid out to delegators.
- `GiveDelegateRewardPercentage` — fraction of delegation reward paid out to delegators.

Payouts to delegators are distributed pro-rata by delegation weight on that pillar. Because the operator is himself a delegator (his self-delegation), the operator receives back `self/total_delegation` of whatever he "gives" to delegators.

**Zenon.org's observed pillar configuration: 55% momentum / 100% delegation given to delegators.**

### 2.6 Pillar launch mechanics

```
ZNN lock per pillar         15,000   # recoverable on pillar retirement
QSR next pillar cost        330,000  # burned, not locked
QSR cost escalation         +10,000 per pillar launched (network-wide)
Top-30 delegation threshold 95,000   # minimum self-delegation to hold a top-30 slot
```

### 2.7 Operator starting state

```
Top-30 pillars       4
Bottom pillars       2
Next pillar cost     330,000 QSR
```

---

## 3. Model

The simulator is a pure function `simulate(params, strategy) → list[MonthRecord]` that ticks monthly for `params.months` steps. Two strategies ship:

### 3.1 `LockThresholdStrategy` (default, user-specified)

Each month:
1. Compute monthly ZNN earned (producing + delegation, net of operator/delegator split) based on current pillar counts.
2. Add to `znn_balance`.
3. **Accumulate until 15,000.** If `znn_balance` exceeds the per-pillar lock amount (plus any reserve held for planned promotions), sell the surplus for QSR at the configured swap rate.
4. **Launch when affordable.** While `qsr_balance ≥ next_qsr_cost` AND `znn_balance ≥ 15,000`: burn `next_qsr_cost` QSR, lock 15,000 ZNN, add one bottom pillar, bump `next_qsr_cost` by 10,000.
5. **Year-end promotion** (optional, `promote_to_top30=True`): if `znn_balance ≥ 95,000` and `top30 < operator_max_top30` and `bottom > 0`, self-delegate 95,000 ZNN to promote a bottom pillar to top-30. Capped at `max_promotions_per_year`.

### 3.2 `SellAllYearlyStrategy` (baseline-reproduction only)

Accumulates ZNN for 11 months, then at month 12 applies the original reference skeleton: find the largest feasible `k`, lock `k * 15,000`, sell all remaining ZNN for QSR, burn QSR for `k` launches. Used only to verify the engine reproduces the 5/8/12/17 baseline table; not the user-facing default.

### 3.3 Reward computation per month

Producing (simplified pool-split model — happens to match the public calculator's ~28.34 ZNN/day for top-30 within 1.6%):

```
pool_daily            = znn_daily_emissions * pillar_pool_fraction                    # 2,160
top30_pool_daily      = pool_daily * top30_fraction                                    # 864
bottom_pool_daily     = pool_daily - top30_pool_daily                                  # 1,296
per_top30_daily       = top30_pool_daily / top30_slots                                 # 28.80

# bottom per-pillar depends on dilute_bottom_rewards:
per_bottom_daily      = bottom_pool_daily / total_bottom_pillars_on_network            # 19.34 at start
per_bottom_daily      = bottom_pool_daily / (starting_total_pillars - top30_slots)     # fixed denominator (off)
```

Delegation (protocol-accurate, denominator grows with network size):

```
delegation_pool_daily      = znn_daily_emissions * delegation_pool_fraction            # 1,036.8
operator_delegation_weight = top30 * pillar_total_delegation_top30 + bottom * pillar_total_delegation_bottom
network_total_delegation   = total_top30_on_network * network_avg_top30_delegation
                           + total_bottom_on_network * network_avg_bottom_delegation
delegation_daily_gross     = delegation_pool_daily * (operator_weight / network_total_delegation)
```

Operator take — each gross reward is multiplied by `operator_keep_fraction`:

```
self_share       = operator_self_delegation_weight / operator_delegation_weight
keep_momentum    = (1 - give_momentum/100)   + (give_momentum/100)   * self_share
keep_delegation  = (1 - give_delegation/100) + (give_delegation/100) * self_share
```

With defaults (150K total / 100K self per top-30, 55% momentum / 100% delegation given to delegators):

```
self_share       = 2/3
keep_momentum    = 0.45 + 0.55 * 2/3 ≈ 0.817
keep_delegation  = 0.00 + 1.00 * 2/3 ≈ 0.667
```

---

## 4. Assumptions (what we've simplified)

These are deliberate simplifications. Each is a user-facing knob or a declared scope boundary.

1. **Producing rates are the simplified pool-split values** (28.80 / 19.34), not the theoretical max of 42.59 / 13.17. They happen to closely match the public calculator (28.34 / 13.27) and avoid modeling uptime.
2. **Delegation reward is steady-state.** Computed as `pool * (op_weight / network_weight)` with no missed momentums.
3. **Delegation weights are static per pillar.** Per-pillar totals (150K / 100K self) don't change as the operator grows. External delegators aren't modeled dynamically — they're represented only through `network_avg_*_delegation`, which affects the pool denominator.
4. **Network total delegation is a constant input** (default 5.5M ZNN). Real-world grows with emissions and delegator behavior.
5. **Bottom-tier dilution is optional** (`dilute_bottom_rewards=True`), off by default.
6. **Swap rate is exogenous.** No market-impact model.
7. **QSR emission cap is not enforced.** Long horizons may exceed realistic supply.
8. **Top-30 cap is `operator_max_top30`** (default 30 = full takeover possible). No adversarial redelegation.
9. **No delegator flight** as accumulation becomes visible.
10. **No ZNN emission taper.** 4,320/day is perpetual.
11. **`SellAllYearlyStrategy` is baseline-reproduction only** — not real operator behavior.

---

## 5. Configurable parameters (complete list)

Every knob below is a field on `SimParams`, exposed in the sidebar UI.

### Network
| Parameter | Default | Meaning |
|---|---|---|
| `znn_daily_emissions` | 4,320 | Total ZNN minted per day |
| `qsr_daily_emissions` | 5,000 | Total QSR minted per day (used by the inflation-share chart) |
| `pillar_pool_fraction` | 0.50 | Fraction of ZNN emissions to producing pool |
| `top30_fraction` | 0.40 | Producing pool split — fraction to top-30 |
| `top30_slots` | 30 | Total top-30 seats |
| `znn_lock_per_pillar` | 15,000 | ZNN locked on launch (stake, recoverable — not delegation) |
| `top30_delegation_threshold` | 95,000 | ZNN needed to self-delegate for top-30 |
| `qsr_cost_step` | 10,000 | Per-launch cost escalation |
| `starting_total_pillars` | 97 | Network pillar count at t=0 (30 top + 67 bottom) |

### Operator start
| Parameter | Default | Meaning |
|---|---|---|
| `start_top30` | 4 | Top-30 pillars at t=0 |
| `start_bottom` | 2 | Bottom pillars at t=0 |
| `start_next_qsr_cost` | 330,000 | Cost of next launch at t=0 |
| `start_znn` / `start_qsr` | 0 / 0 | Starting balances |

### Run
| Parameter | Default | Meaning |
|---|---|---|
| `months` | 120 | Horizon in months |
| `swap_rate` | 5.0 | QSR per ZNN sold |
| `strategy_name` | `lock_threshold` | Operator policy |

### Strategy
| Parameter | Default | Meaning |
|---|---|---|
| `promote_to_top30` | false | Attempt year-end promotions |
| `max_promotions_per_year` | 1 | Cap on promotions per year |
| `operator_max_top30` | 30 | Upper bound on operator top-30 count |

### Delegation reward (operator's pillars)
| Parameter | Default | Meaning |
|---|---|---|
| `include_delegation_reward` | true | Add delegation-pool income |
| `delegation_pool_fraction` | 0.24 | Fraction of ZNN emissions to delegation pool |
| `pillar_total_delegation_top30` | 150,000 | Total ZNN delegated to each of the operator's top-30 pillars |
| `pillar_self_delegation_top30` | 100,000 | Of which, self-delegated |
| `pillar_total_delegation_bottom` | 0 | Total ZNN delegated to each bottom pillar (stake ≠ delegation) |
| `pillar_self_delegation_bottom` | 0 | Of which, self-delegated |

### Delegation reward (network baseline — dynamic denominator)
Network total delegation is computed each month as
`total_top30 × network_avg_top30_delegation + total_bottom × network_avg_bottom_delegation`.
It grows automatically as pillars come online (operator's and competitors').

| Parameter | Default | Meaning |
|---|---|---|
| `network_avg_top30_delegation` | 150,000 | Avg total delegation per top-30 pillar, network-wide |
| `network_avg_bottom_delegation` | 0 | Avg total delegation per bottom pillar, network-wide |

### Reward split with delegators
| Parameter | Default | Meaning |
|---|---|---|
| `give_momentum_reward_pct` | 55 | % of momentum reward paid to delegators |
| `give_delegation_reward_pct` | 100 | % of delegation reward paid to delegators |

### Dilution and network growth
| Parameter | Default | Meaning |
|---|---|---|
| `dilute_bottom_rewards` | true | Divide bottom pool by live bottom-pillar count (off = fixed 67 for baseline repro) |
| `network_growth_per_year` | 0 | New bottom pillars/year added by other operators (quantized to whole units) |

---

## 6. Verification

1. **Baseline table.** `pytest python/tests/test_baseline.py` reproduces the original 5/8/12/17 launch table exactly using `SellAllYearlyStrategy` with `include_delegation_reward=False`, `give_momentum_reward_pct=0`, and `dilute_bottom_rewards=False`.
2. **Invariants.** Balances never negative, top-30 never exceeds cap, cost monotone non-decreasing, QSR flow conservation.
3. **Python ↔ TS parity.** `shared/fixtures/*.json` encode 20+ scenarios; Vitest asserts TS output equals Python to 6 decimal places.

---

## 7. Roadmap

Not yet implemented:

- Dynamic swap rate (market-impact model — rate degrades as cumulative ZNN is sold).
- ZNN emission taper matching the actual Zenon emission curve.
- Delegator-flight model (visible accumulation → counter-delegation).
- Accelerator-Z governance-weight metric as a primary output.
- Dynamic `network_total_delegation` that grows with emissions.
- Uptime / missed-momentum modeling.

Open questions for the user:

- Is `network_total_delegation = 5.5M` current? A fresh on-chain snapshot would improve fidelity.
- Should newly-launched pillars inherit the default 150K/100K delegation, or start with minimal external delegation and accumulate over time?
- Does the 55/100 momentum/delegation split apply uniformly across all Zenon.org pillars?
