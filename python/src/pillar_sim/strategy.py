"""Pluggable operator strategies.

The engine handles time ticks, reward accrual, and record-keeping. Each strategy
handles the operator's behavioral choices (when to sell ZNN for QSR, when to
launch a pillar, when to promote a bottom pillar into top-30). This keeps the
economic model decoupled from the operator's policy so new policies can be
added without touching the engine."""

from dataclasses import dataclass
from typing import Protocol

from pillar_sim.params import SimParams
from pillar_sim.state import NetworkState, OperatorState


@dataclass
class MonthlyEffects:
    znn_sold: float = 0.0
    qsr_acquired: float = 0.0
    qsr_spent: float = 0.0
    launches: int = 0
    promotions: int = 0


class Strategy(Protocol):
    def step(
        self,
        params: SimParams,
        operator: OperatorState,
        network: NetworkState,
        month: int,
    ) -> MonthlyEffects: ...


def _effective_top30_cap(params: SimParams) -> int:
    return min(params.top30_slots, params.operator_max_top30)


def _try_launch(params: SimParams, operator: OperatorState, effects: MonthlyEffects) -> None:
    """Burn one pillar's worth of QSR and lock one pillar's worth of ZNN, add
    a bottom pillar. Caller must check feasibility first."""
    operator.qsr_balance -= operator.next_qsr_cost
    effects.qsr_spent += operator.next_qsr_cost
    operator.znn_balance -= params.znn_lock_per_pillar
    operator.bottom += 1
    operator.next_qsr_cost += params.qsr_cost_step
    effects.launches += 1


def _try_promote(
    params: SimParams, operator: OperatorState, effects: MonthlyEffects, max_this_cycle: int
) -> None:
    cap = _effective_top30_cap(params)
    promoted = 0
    while (
        promoted < max_this_cycle
        and operator.znn_balance >= params.top30_delegation_threshold
        and operator.bottom > 0
        and operator.top30 < cap
    ):
        operator.znn_balance -= params.top30_delegation_threshold
        operator.znn_self_delegated += params.top30_delegation_threshold
        operator.bottom -= 1
        operator.top30 += 1
        promoted += 1
        effects.promotions += 1


class LockThresholdStrategy:
    """Default policy. Monthly tick. Accumulate ZNN until balance reaches one
    pillar's lock amount (15,000), then start converting any further earnings
    into QSR. Launch whenever QSR is sufficient. At year end, optionally
    promote a bottom pillar into top-30 if enough ZNN has been reserved."""

    def step(
        self,
        params: SimParams,
        operator: OperatorState,
        network: NetworkState,
        month: int,
    ) -> MonthlyEffects:
        effects = MonthlyEffects()

        # Reserve enough ZNN for the next pillar lock plus any promotions the
        # operator plans to do this year; sell the rest for QSR.
        reserve = params.znn_lock_per_pillar
        if params.promote_to_top30 and operator.bottom > 0:
            # Reserve for up to max_promotions_per_year over the current year;
            # once executed promotions consume from znn_balance so the reserve
            # effectively shrinks as the year progresses.
            reserve += params.top30_delegation_threshold * params.max_promotions_per_year

        if operator.znn_balance > reserve:
            surplus = operator.znn_balance - reserve
            operator.znn_balance -= surplus
            operator.qsr_balance += surplus * params.swap_rate
            effects.znn_sold += surplus
            effects.qsr_acquired += surplus * params.swap_rate

        # Launch as many pillars as affordable this month.
        while (
            operator.qsr_balance >= operator.next_qsr_cost
            and operator.znn_balance >= params.znn_lock_per_pillar
        ):
            _try_launch(params, operator, effects)

        # Year-end promotion attempt.
        if params.promote_to_top30 and month % 12 == 0:
            _try_promote(params, operator, effects, params.max_promotions_per_year)

        return effects


class SellAllYearlyStrategy:
    """Reproduces the reference skeleton in spec.md §"Reference Python skeleton".
    Ticks monthly for uniform record output, but operates at yearly granularity:
    accumulates ZNN for 11 months, then at month 12 finds the max feasible
    launch count k, locks k * 15k ZNN, sells ALL remaining ZNN for QSR, and
    burns QSR for k pillar launches. Intended only for reproducing the
    spec.md baseline table (5/8/12/17 pillars at swap 1:3/1:5/1:7/1:10) to
    verify the rest of the engine is correct; not the default user-facing
    behavior."""

    def step(
        self,
        params: SimParams,
        operator: OperatorState,
        network: NetworkState,
        month: int,
    ) -> MonthlyEffects:
        effects = MonthlyEffects()
        if month % 12 != 0:
            return effects  # accumulate silently

        znn_bal = operator.znn_balance
        next_cost = operator.next_qsr_cost
        qsr_bal = operator.qsr_balance

        def feasible(k: int) -> bool:
            locks = k * params.znn_lock_per_pillar
            sellable = znn_bal - locks
            if sellable < 0:
                return False
            qsr_total = sum(
                next_cost + params.qsr_cost_step * i for i in range(k)
            )
            return (qsr_bal + sellable * params.swap_rate) >= qsr_total

        k = 0
        while feasible(k + 1):
            k += 1

        znn_to_sell = znn_bal - k * params.znn_lock_per_pillar
        qsr_acquired = znn_to_sell * params.swap_rate

        # Sell surplus now; _try_launch consumes the k * 15,000 still reserved
        # in znn_balance. After k launches the balance returns to 0, matching
        # the skeleton's yearly reset.
        operator.znn_balance -= znn_to_sell
        operator.qsr_balance += qsr_acquired
        effects.znn_sold += znn_to_sell
        effects.qsr_acquired += qsr_acquired

        for _ in range(k):
            _try_launch(params, operator, effects)

        if params.promote_to_top30:
            _try_promote(params, operator, effects, params.max_promotions_per_year)

        return effects


def make_strategy(name: str) -> Strategy:
    if name == "lock_threshold":
        return LockThresholdStrategy()
    if name == "sell_all_yearly":
        return SellAllYearlyStrategy()
    raise ValueError(f"unknown strategy: {name}")
