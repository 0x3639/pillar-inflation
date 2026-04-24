"""Named parameter presets used for baseline reproduction and fixture
generation. Kept here so the TS side can reference the same scenario names."""

from pillar_sim.params import SimParams


def baseline_scenarios() -> dict[str, SimParams]:
    """The spec.md baseline sweep — SellAllYearly, no extensions, no promotion,
    no delegation reward, no operator/delegator split, and fixed bottom-pool
    denominator (67). The spec predates all later protocol findings."""
    return {
        f"baseline_1to{rate}": SimParams(
            swap_rate=float(rate),
            strategy_name="sell_all_yearly",
            months=120,
            include_delegation_reward=False,
            give_momentum_reward_pct=0.0,
            dilute_bottom_rewards=False,
        )
        for rate in range(3, 11)
    }


def lock_threshold_scenarios() -> dict[str, SimParams]:
    """Default strategy sweep."""
    return {
        f"lock_1to{rate}": SimParams(
            swap_rate=float(rate),
            strategy_name="lock_threshold",
            months=120,
        )
        for rate in (3, 5, 7, 10)
    }


def extension_scenarios() -> dict[str, SimParams]:
    """Parameter combinations exercising extension toggles and promotion."""
    return {
        "promote_max1_swap10": SimParams(
            swap_rate=10.0,
            strategy_name="lock_threshold",
            months=120,
            promote_to_top30=True,
            max_promotions_per_year=1,
        ),
        "dilute_swap10": SimParams(
            swap_rate=10.0,
            strategy_name="lock_threshold",
            months=120,
            dilute_bottom_rewards=True,
        ),
        "dilute_growth_swap10": SimParams(
            swap_rate=10.0,
            strategy_name="lock_threshold",
            months=120,
            dilute_bottom_rewards=True,
            network_growth_per_year=5.0,
        ),
        "long_horizon_swap7": SimParams(
            swap_rate=7.0,
            strategy_name="lock_threshold",
            months=240,
        ),
        "low_swap_1to1": SimParams(
            swap_rate=1.0,
            strategy_name="lock_threshold",
            months=120,
        ),
        "delegation_heavy_swap10": SimParams(
            swap_rate=10.0,
            strategy_name="lock_threshold",
            months=120,
            pillar_total_delegation_top30=250_000,
            pillar_self_delegation_top30=150_000,
            network_avg_top30_delegation=200_000,
        ),
        "delegation_off_lock_1to7": SimParams(
            swap_rate=7.0,
            strategy_name="lock_threshold",
            months=120,
            include_delegation_reward=False,
        ),
        "operator_keeps_all_swap10": SimParams(
            swap_rate=10.0,
            strategy_name="lock_threshold",
            months=120,
            give_momentum_reward_pct=0.0,
            give_delegation_reward_pct=0.0,
        ),
    }


def all_fixture_scenarios() -> dict[str, SimParams]:
    """Everything we freeze as a golden fixture for TS parity testing."""
    return {**baseline_scenarios(), **lock_threshold_scenarios(), **extension_scenarios()}
