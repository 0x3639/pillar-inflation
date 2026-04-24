"""matplotlib output for static reports. Isolated from the engine so tests
and the CLI can run without importing matplotlib."""

from pathlib import Path

from pillar_sim.params import SimParams
from pillar_sim.engine import simulate
from pillar_sim.scenarios import lock_threshold_scenarios


def plot_swap_sweep(out_path: Path, scenarios: dict[str, SimParams] | None = None) -> Path:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    scen = scenarios or lock_threshold_scenarios()

    fig, ax = plt.subplots(figsize=(10, 6))
    for name, params in scen.items():
        records = simulate(params)
        months = [r.month for r in records]
        totals = [r.total_pillars for r in records]
        label = f"swap 1:{int(params.swap_rate)}"
        ax.plot(months, totals, label=label, linewidth=2)

    ax.set_xlabel("Month")
    ax.set_ylabel("Operator pillars")
    ax.set_title("Operator pillar count over time (LockThresholdStrategy)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    return out_path


def plot_pillar_breakdown(out_path: Path, params: SimParams) -> Path:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    records = simulate(params)
    months = [r.month for r in records]
    top30 = [r.pillars_top30 for r in records]
    bottom = [r.pillars_bottom for r in records]

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.stackplot(months, top30, bottom, labels=["Top-30", "Bottom"], alpha=0.8)
    ax.set_xlabel("Month")
    ax.set_ylabel("Operator pillars")
    ax.set_title(
        f"Top-30 vs Bottom pillars (swap 1:{params.swap_rate:g}, "
        f"{params.strategy_name}, promote={params.promote_to_top30})"
    )
    ax.legend(loc="upper left")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    return out_path
