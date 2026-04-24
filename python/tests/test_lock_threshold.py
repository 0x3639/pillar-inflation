"""Verify LockThresholdStrategy behaves as the user described:
"accumulate until 15,000 ZNN, then sell monthly surplus for QSR until he
has enough to launch another pillar."

Baseline-parity numerics are a coarse sanity check — the strategy is
intentionally more aggressive than SellAllYearly so they won't match exactly,
but launch counts should be close and invariants must hold."""

import pytest

from pillar_sim import SimParams, simulate


def test_znn_balance_never_exceeds_lock_reserve_except_momentarily():
    """Core invariant of LockThreshold: once znn_balance > reserve, the
    strategy must sell in the SAME month, bringing it back to reserve. We check
    that the end-of-month balance is never more than a tiny epsilon above the
    reserve (the reserve itself is allowed; surplus isn't)."""
    params = SimParams(swap_rate=5.0, strategy_name="lock_threshold", months=120)
    records = simulate(params)
    reserve = params.znn_lock_per_pillar  # 15,000 when promote is off
    for r in records:
        assert r.znn_balance_end <= reserve + 1e-6, (
            f"month {r.month}: znn_balance_end={r.znn_balance_end} > reserve={reserve}"
        )


def test_lock_threshold_launches_increase_with_swap_rate():
    """Higher swap rate → more QSR per ZNN sold → more pillars launched.
    Monotone in swap rate."""
    counts = []
    for rate in (3, 5, 7, 10):
        params = SimParams(swap_rate=float(rate), strategy_name="lock_threshold", months=120)
        records = simulate(params)
        counts.append(sum(r.launches_this_month for r in records))
    for a, b in zip(counts, counts[1:]):
        assert b >= a, f"launches not monotone in swap rate: {counts}"


def test_lock_threshold_matches_baseline_at_low_swap_without_delegation():
    """With both the delegation reward AND operator/delegator split disabled
    (matching spec.md's original assumptions exactly), LockThreshold at
    swap 1:3 should still launch 5 pillars over 10 years — same as
    SellAllYearly baseline, confirming no compounding artifact from the
    monthly tick."""
    params = SimParams(
        swap_rate=3.0,
        strategy_name="lock_threshold",
        months=120,
        include_delegation_reward=False,
        give_momentum_reward_pct=0.0,
    )
    records = simulate(params)
    assert sum(r.launches_this_month for r in records) == 5


def test_delegation_reward_increases_launches():
    """Turning on delegation reward must not reduce the operator's pillar
    accumulation — he earns strictly more ZNN per month."""
    without = SimParams(
        swap_rate=3.0,
        strategy_name="lock_threshold",
        months=120,
        include_delegation_reward=False,
    )
    with_del = SimParams(
        swap_rate=3.0,
        strategy_name="lock_threshold",
        months=120,
        include_delegation_reward=True,
    )
    n_without = sum(r.launches_this_month for r in simulate(without))
    n_with = sum(r.launches_this_month for r in simulate(with_del))
    assert n_with >= n_without


def test_promote_requires_reserved_znn():
    """With promote_to_top30=True and max_promotions=1, the reserve grows from
    15k to 15k + 95k = 110k. The operator must accumulate that much before
    selling surplus; until then, no QSR is acquired."""
    params = SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=36,
        promote_to_top30=True,
        max_promotions_per_year=1,
    )
    records = simulate(params)
    # In the first year he earns ~56k ZNN total. He should accumulate toward
    # 110k without selling (qsr_balance stays at 0 through most of year 1).
    year1 = [r for r in records if r.year == 1]
    assert year1[0].qsr_balance_end == 0.0
    assert year1[-1].qsr_balance_end == 0.0


def test_promote_increases_top30_when_znn_available():
    """Verify the promotion path actually fires when the operator accumulates
    enough ZNN to promote and is below operator_max_top30."""
    params = SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=120,
        promote_to_top30=True,
        max_promotions_per_year=1,
        operator_max_top30=30,
    )
    records = simulate(params)
    final = records[-1]
    total_promos = sum(r.promotions_this_month for r in records)
    assert total_promos > 0
    assert final.pillars_top30 > params.start_top30
    assert final.znn_self_delegated_end == total_promos * params.top30_delegation_threshold


def test_operator_max_top30_is_respected():
    """If operator_max_top30 = starting top30, no promotions are possible."""
    params = SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=120,
        promote_to_top30=True,
        max_promotions_per_year=1,
        operator_max_top30=4,  # starts with 4, can't grow
    )
    records = simulate(params)
    assert sum(r.promotions_this_month for r in records) == 0
