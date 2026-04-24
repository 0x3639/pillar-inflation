"""Core simulation engine. Pure function: given parameters and a strategy,
returns a list of MonthRecord — one per month — for deterministic analysis."""

from typing import Optional

from pillar_sim.params import SimParams
from pillar_sim.rewards import (
    MONTHS_PER_YEAR,
    monthly_znn_earned,
    network_total_delegation,
)
from pillar_sim.state import MonthRecord, NetworkState, OperatorState
from pillar_sim.strategy import Strategy, make_strategy


def simulate(params: SimParams, strategy: Optional[Strategy] = None) -> list[MonthRecord]:
    if strategy is None:
        strategy = make_strategy(params.strategy_name)

    operator = OperatorState(
        top30=params.start_top30,
        bottom=params.start_bottom,
        znn_balance=params.start_znn,
        qsr_balance=params.start_qsr,
        znn_self_delegated=0.0,
        next_qsr_cost=params.start_next_qsr_cost,
    )

    # Competitors are split by tier so dilution divides by the correct
    # denominator. With defaults: 30 − 4 = 26 competitor top-30 and
    # 97 − 30 − 2 = 65 competitor bottom.
    competitor_top30 = float(max(params.top30_slots - operator.top30, 0))
    competitor_bottom = float(
        max(params.starting_total_pillars - params.top30_slots - operator.bottom, 0)
    )
    network = NetworkState(
        competitor_top30=competitor_top30,
        competitor_bottom=competitor_bottom,
    )

    records: list[MonthRecord] = []
    monthly_growth = params.network_growth_per_year / MONTHS_PER_YEAR
    # Fractional accumulator — only whole pillars are ever added to the network.
    # With growth=7.5/year, ~0.625 accumulates per month; a whole pillar spawns
    # every ~1.6 months.
    growth_accumulator = 0.0

    for month in range(1, params.months + 1):
        growth_accumulator += monthly_growth
        if growth_accumulator >= 1.0:
            whole = int(growth_accumulator)
            network.competitor_bottom += whole
            growth_accumulator -= whole
        network.months_elapsed = month

        earned, per_top30, per_bottom, delegation_monthly = monthly_znn_earned(
            params, operator, network
        )
        operator.znn_balance += earned

        effects = strategy.step(params, operator, network, month)

        assert operator.znn_balance >= -1e-6, f"znn went negative at month {month}"
        assert operator.qsr_balance >= -1e-6, f"qsr went negative at month {month}"
        assert operator.top30 <= params.top30_slots, f"top30 exceeded cap at month {month}"

        year = (month - 1) // 12 + 1
        records.append(
            MonthRecord(
                month=month,
                year=year,
                pillars_top30=operator.top30,
                pillars_bottom=operator.bottom,
                total_pillars=operator.top30 + operator.bottom,
                znn_balance_end=operator.znn_balance,
                qsr_balance_end=operator.qsr_balance,
                znn_self_delegated_end=operator.znn_self_delegated,
                znn_earned_month=earned,
                delegation_znn_month=delegation_monthly,
                znn_sold_month=effects.znn_sold,
                qsr_acquired_month=effects.qsr_acquired,
                qsr_spent_month=effects.qsr_spent,
                launches_this_month=effects.launches,
                promotions_this_month=effects.promotions,
                next_qsr_cost=operator.next_qsr_cost,
                per_top30_daily=per_top30,
                per_bottom_daily=per_bottom,
                competitor_top30=network.competitor_top30,
                competitor_bottom=network.competitor_bottom,
                network_total_delegation=network_total_delegation(params, operator, network),
            )
        )

    return records


def year_end_records(records: list[MonthRecord]) -> list[MonthRecord]:
    return [r for r in records if r.month % 12 == 0]
