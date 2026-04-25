from dataclasses import dataclass, asdict, field
from typing import Literal

StrategyName = Literal["lock_threshold", "sell_all_yearly"]


@dataclass(frozen=True)
class SimParams:
    # Network
    znn_daily_emissions: float = 4320.0
    qsr_daily_emissions: float = 5000.0  # informational; used for inflation-share charts
    pillar_pool_fraction: float = 0.50
    top30_fraction: float = 0.40
    top30_slots: int = 30
    znn_lock_per_pillar: float = 15_000.0
    top30_delegation_threshold: float = 95_000.0
    qsr_cost_step: float = 10_000.0
    starting_total_pillars: int = 97  # 30 top + 67 bottom, per spec

    # Operator starting state
    start_top30: int = 4
    start_bottom: int = 2
    start_next_qsr_cost: float = 330_000.0
    start_znn: float = 0.0
    start_qsr: float = 0.0

    # Run
    months: int = 120
    swap_rate: float = 8.0

    # Strategy
    strategy_name: StrategyName = "lock_threshold"
    promote_to_top30: bool = False
    max_promotions_per_year: int = 1
    # Upper bound on operator top-30 count. Default = full takeover possible.
    # Set lower to model competitors with unshakeable delegation (extension #4).
    operator_max_top30: int = 30

    # Extensions. dilute_bottom_rewards=True is the realistic default: the
    # 1,296 ZNN/day bottom pool is divided by the actual live count of bottom
    # pillars on the network (operator's + competitors'). Set to False only to
    # reproduce the spec.md baseline (which used a fixed divisor of 67).
    dilute_bottom_rewards: bool = True
    network_growth_per_year: float = 0.0  # new bottom pillars/year added by other operators

    # Delegation reward (24% of daily emissions). Protocol-accurate: operator's
    # share of the pool = his total delegation weight / network total delegation.
    # Defaults per Zenon.org on-chain configuration (see znn-pillar-reward .md):
    # each top-30 pillar has 150,000 ZNN delegated, 100,000 of which is self.
    # The 15,000 ZNN locked to LAUNCH a pillar is stake, NOT delegation — bottom
    # pillars therefore have 0 delegation by default.
    include_delegation_reward: bool = True
    delegation_pool_fraction: float = 0.24
    pillar_total_delegation_top30: float = 150_000.0
    pillar_self_delegation_top30: float = 100_000.0
    pillar_total_delegation_bottom: float = 0.0  # 15k lock is stake, not delegation
    pillar_self_delegation_bottom: float = 0.0

    # Network total delegation is computed dynamically from average per-pillar
    # delegation × live pillar count, so as pillars are added (operator's or
    # competitors') the denominator grows. Set either avg to 0 to fully insulate
    # that tier from delegation-pool dilution.
    network_avg_top30_delegation: float = 150_000.0  # avg total del per top-30 pillar
    network_avg_bottom_delegation: float = 0.0       # avg total del per bottom pillar (stake ≠ del)

    # Operator/delegator split (per the Zenon pillar dashboard "Momentum /
    # Delegate rewards %"). These are "percent given to delegators". The
    # operator reclaims `self_delegation_share` of what's given out. Default
    # 55/100 matches the observed Zenon.org pillar configuration.
    give_momentum_reward_pct: float = 55.0
    give_delegation_reward_pct: float = 100.0

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "SimParams":
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in d.items() if k in known})
