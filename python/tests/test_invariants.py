"""Properties that must hold regardless of strategy or parameter choice."""

import pytest

from pillar_sim import SimParams, simulate


SCENARIOS = [
    SimParams(swap_rate=3.0, strategy_name="sell_all_yearly", months=120),
    SimParams(swap_rate=10.0, strategy_name="sell_all_yearly", months=120),
    SimParams(swap_rate=3.0, strategy_name="lock_threshold", months=120),
    SimParams(swap_rate=10.0, strategy_name="lock_threshold", months=120),
    SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=120,
        promote_to_top30=True,
    ),
    SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=120,
        dilute_bottom_rewards=True,
        network_growth_per_year=3.0,
    ),
]


@pytest.mark.parametrize("params", SCENARIOS)
def test_balances_never_negative(params: SimParams):
    for r in simulate(params):
        assert r.znn_balance_end >= -1e-6
        assert r.qsr_balance_end >= -1e-6


@pytest.mark.parametrize("params", SCENARIOS)
def test_next_qsr_cost_is_monotone_nondecreasing(params: SimParams):
    records = simulate(params)
    for a, b in zip(records, records[1:]):
        assert b.next_qsr_cost >= a.next_qsr_cost


@pytest.mark.parametrize("params", SCENARIOS)
def test_top30_never_exceeds_cap(params: SimParams):
    cap = min(params.top30_slots, params.operator_max_top30)
    for r in simulate(params):
        assert r.pillars_top30 <= cap


@pytest.mark.parametrize("params", SCENARIOS)
def test_pillar_count_increases_monotonically(params: SimParams):
    """Pillars are only added, never removed (even on promotion, total stays
    constant since a bottom becomes a top30)."""
    records = simulate(params)
    for a, b in zip(records, records[1:]):
        assert b.total_pillars >= a.total_pillars


@pytest.mark.parametrize("params", SCENARIOS)
def test_qsr_conservation(params: SimParams):
    """QSR in the operator's balance equals cumulative acquired minus cumulative spent,
    plus the starting balance."""
    records = simulate(params)
    cum_acq = sum(r.qsr_acquired_month for r in records)
    cum_spent = sum(r.qsr_spent_month for r in records)
    expected = params.start_qsr + cum_acq - cum_spent
    assert abs(records[-1].qsr_balance_end - expected) < 1e-4
