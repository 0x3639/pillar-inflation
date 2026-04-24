"""Blocking gate: must reproduce spec.md §"Baseline reference results" exactly.

If this test fails, STOP — the engine's interpretation of the skeleton diverged
from the prior analysis and anything downstream (interactive UI, new strategies)
would be suspect."""

import pytest

from pillar_sim import SimParams, simulate
from pillar_sim.engine import year_end_records


EXPECTED = [
    # (swap_rate, pillars_launched, final_total)
    (3, 5, 11),
    (5, 8, 14),
    (7, 12, 18),
    (10, 17, 23),
]


@pytest.mark.parametrize("swap,expected_launched,expected_final", EXPECTED)
def test_spec_baseline_table(swap: int, expected_launched: int, expected_final: int):
    params = SimParams(
        swap_rate=float(swap),
        strategy_name="sell_all_yearly",
        months=120,
        include_delegation_reward=False,  # spec.md table predates the delegation-pool finding
        give_momentum_reward_pct=0.0,  # spec.md assumed operator keeps 100%
        dilute_bottom_rewards=False,  # spec.md used a fixed 67-pillar denominator
    )
    records = simulate(params)
    total_launched = sum(r.launches_this_month for r in records)
    final = records[-1]

    assert total_launched == expected_launched, (
        f"swap 1:{swap} expected {expected_launched} launches, got {total_launched}"
    )
    assert final.total_pillars == expected_final, (
        f"swap 1:{swap} expected final {expected_final} pillars, got {final.total_pillars}"
    )


def test_sell_all_yearly_only_launches_at_year_end():
    params = SimParams(
        swap_rate=10.0,
        strategy_name="sell_all_yearly",
        months=120,
        include_delegation_reward=False,
        give_momentum_reward_pct=0.0,
        dilute_bottom_rewards=False,
    )
    records = simulate(params)
    for r in records:
        if r.month % 12 != 0:
            assert r.launches_this_month == 0, (
                f"SellAllYearly launched mid-year at month {r.month}"
            )


def test_next_cost_escalates_per_launch():
    params = SimParams(
        swap_rate=10.0,
        strategy_name="sell_all_yearly",
        months=120,
        include_delegation_reward=False,
        give_momentum_reward_pct=0.0,
        dilute_bottom_rewards=False,
    )
    records = simulate(params)
    total_launched = sum(r.launches_this_month for r in records)
    # Cost after N launches = 330,000 + 10,000 * N
    expected_next = 330_000 + 10_000 * total_launched
    assert records[-1].next_qsr_cost == expected_next
