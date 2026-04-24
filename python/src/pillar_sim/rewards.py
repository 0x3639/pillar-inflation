"""Per-month reward computation.

Two reward pools feed the operator:

1. **Producing (momentum) pool** — 50% of daily emissions (2,160 ZNN/day).
   Top-30: always 864 ZNN/day split across exactly 30 slots = 28.80/pillar.
   The per-slot rate never dilutes regardless of network size.
   Bottom: 1,296 ZNN/day split across the live count of bottom pillars
   (operator's + competitors') when `dilute_bottom_rewards=True`. As more
   bottom pillars come online, each earns less.

2. **Delegation pool** — 24% of daily emissions (1,037 ZNN/day). Paid
   pro-rata by delegation weight. Network total delegation is computed
   dynamically as `top30_slots × avg_top30_delegation + total_bottom_pillars
   × avg_bottom_delegation`, so it grows as pillars are added."""

from pillar_sim.params import SimParams
from pillar_sim.state import NetworkState, OperatorState


MONTHS_PER_YEAR = 12
DAYS_PER_YEAR = 365


def pool_daily(params: SimParams) -> tuple[float, float]:
    pool = params.znn_daily_emissions * params.pillar_pool_fraction
    top30_pool = pool * params.top30_fraction
    bottom_pool = pool - top30_pool
    return top30_pool, bottom_pool


def per_pillar_daily(
    params: SimParams, operator: OperatorState, network: NetworkState
) -> tuple[float, float]:
    top30_pool, bottom_pool = pool_daily(params)
    per_top30 = top30_pool / params.top30_slots

    if params.dilute_bottom_rewards:
        total_bottom = network.total_bottom(operator)
        per_bottom = bottom_pool / total_bottom if total_bottom > 0 else 0.0
    else:
        fixed_bottom = max(params.starting_total_pillars - params.top30_slots, 1)
        per_bottom = bottom_pool / fixed_bottom

    return per_top30, per_bottom


def delegation_pool_daily(params: SimParams) -> float:
    return params.znn_daily_emissions * params.delegation_pool_fraction


def network_total_delegation(
    params: SimParams, operator: OperatorState, network: NetworkState
) -> float:
    """Sum of delegation across all pillars on the network. Operator's
    self-delegation is part of his pillars, which are part of the network —
    so this denominator includes his weight."""
    total_top30 = network.total_top30(operator)
    total_bottom = network.total_bottom(operator)
    return (
        total_top30 * params.network_avg_top30_delegation
        + total_bottom * params.network_avg_bottom_delegation
    )


def operator_delegation_weight(params: SimParams, operator: OperatorState) -> float:
    return (
        operator.top30 * params.pillar_total_delegation_top30
        + operator.bottom * params.pillar_total_delegation_bottom
    )


def operator_self_delegation_weight(params: SimParams, operator: OperatorState) -> float:
    return (
        operator.top30 * params.pillar_self_delegation_top30
        + operator.bottom * params.pillar_self_delegation_bottom
    )


def operator_self_delegation_share(params: SimParams, operator: OperatorState) -> float:
    total = operator_delegation_weight(params, operator)
    if total <= 0:
        return 1.0
    return operator_self_delegation_weight(params, operator) / total


def delegation_znn_daily(
    params: SimParams, operator: OperatorState, network: NetworkState
) -> float:
    if not params.include_delegation_reward:
        return 0.0
    op_weight = operator_delegation_weight(params, operator)
    if op_weight <= 0:
        return 0.0
    net_total = network_total_delegation(params, operator, network)
    if net_total <= 0:
        return 0.0
    return delegation_pool_daily(params) * (op_weight / net_total)


def operator_keep_fraction(give_to_delegators_pct: float, self_share: float) -> float:
    give = give_to_delegators_pct / 100.0
    return (1.0 - give) + give * self_share


def monthly_znn_earned(
    params: SimParams, operator: OperatorState, network: NetworkState
) -> tuple[float, float, float, float]:
    per_top30, per_bottom = per_pillar_daily(params, operator, network)
    producing_daily = operator.top30 * per_top30 + operator.bottom * per_bottom
    producing_monthly_gross = producing_daily * DAYS_PER_YEAR / MONTHS_PER_YEAR
    delegation_monthly_gross = (
        delegation_znn_daily(params, operator, network) * DAYS_PER_YEAR / MONTHS_PER_YEAR
    )

    self_share = operator_self_delegation_share(params, operator)
    producing_keep = operator_keep_fraction(params.give_momentum_reward_pct, self_share)
    delegation_keep = operator_keep_fraction(params.give_delegation_reward_pct, self_share)

    producing_net = producing_monthly_gross * producing_keep
    delegation_net = delegation_monthly_gross * delegation_keep
    return producing_net + delegation_net, per_top30, per_bottom, delegation_net
