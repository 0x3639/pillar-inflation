"""Tests for the extension toggles: bottom-reward dilution and network growth."""

from pillar_sim import SimParams, simulate


def test_dilute_bottom_rewards_decreases_over_time():
    """With dilution on and the operator adding bottom pillars, per_bottom_daily
    should decrease as the total bottom count grows."""
    params = SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=120,
        dilute_bottom_rewards=True,
    )
    records = simulate(params)
    first = records[0].per_bottom_daily
    last = records[-1].per_bottom_daily
    assert last < first, f"dilution should reduce per-bottom rate: {first} -> {last}"


def test_no_dilution_keeps_rates_constant():
    params = SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=120,
        dilute_bottom_rewards=False,
    )
    records = simulate(params)
    rates = {r.per_bottom_daily for r in records}
    assert len(rates) == 1


def test_dilution_matches_spec_default_value():
    """Default params without dilution should reproduce spec.md's 19.34
    per-bottom-daily to within rounding."""
    params = SimParams(dilute_bottom_rewards=False)
    records = simulate(params)
    # spec.md: 1296 / 67 ≈ 19.3432
    assert abs(records[0].per_bottom_daily - (1296 / 67)) < 1e-6


def test_network_growth_increases_competitor_count():
    params = SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=120,
        network_growth_per_year=6.0,
    )
    records = simulate(params)
    # 6 pillars/year over 10 years = 60 added to the bottom tier
    start_competitors = records[0].competitor_bottom
    end_competitors = records[-1].competitor_bottom
    # Pillars are added in whole-unit increments as the fractional accumulator
    # crosses 1. Over 120 months at 0.5/month, exactly 60 pillars spawn.
    assert end_competitors - start_competitors == 60
    # All recorded values must be integers (whole pillars).
    for r in records:
        assert r.competitor_bottom == int(r.competitor_bottom)


def test_network_growth_with_dilution_reduces_rewards_more():
    """Combining dilution + network growth should erode per-bottom faster than
    dilution alone from operator's own pillars."""
    base = SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=120,
        dilute_bottom_rewards=True,
    )
    with_growth = SimParams(
        swap_rate=10.0,
        strategy_name="lock_threshold",
        months=120,
        dilute_bottom_rewards=True,
        network_growth_per_year=5.0,
    )
    base_end = simulate(base)[-1].per_bottom_daily
    growth_end = simulate(with_growth)[-1].per_bottom_daily
    assert growth_end < base_end
