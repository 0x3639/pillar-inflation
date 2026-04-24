"""pillar-sim CLI. Usage:
    pillar-sim run                      # default LockThreshold, swap 1:5
    pillar-sim baseline                 # print spec.md baseline sweep
    pillar-sim sweep                    # print lock-threshold sweep
    pillar-sim plot [out_dir]           # emit PNGs
    pillar-sim emit-fixtures [out_dir]  # write shared/fixtures/*.json
"""

import sys
from pathlib import Path

from pillar_sim.engine import simulate, year_end_records
from pillar_sim.fixtures import emit as emit_fixtures
from pillar_sim.params import SimParams
from pillar_sim.scenarios import baseline_scenarios, lock_threshold_scenarios


def _print_sweep(title: str, scenarios: dict[str, SimParams]) -> None:
    print(title)
    print(f"{'scenario':<22} | swap | launches | promos | top30 | bot | total | next_cost")
    print("-" * 80)
    for name, params in scenarios.items():
        records = simulate(params)
        ye = year_end_records(records) if params.strategy_name == "sell_all_yearly" else records
        final = records[-1]
        launches = sum(r.launches_this_month for r in records)
        promos = sum(r.promotions_this_month for r in records)
        print(
            f"{name:<22} | 1:{int(params.swap_rate):2d} | {launches:8d} | {promos:6d} | "
            f"{final.pillars_top30:5d} | {final.pillars_bottom:3d} | "
            f"{final.total_pillars:5d} | {final.next_qsr_cost:,.0f}"
        )


def main() -> int:
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0

    cmd = argv[0]

    if cmd == "run":
        records = simulate(SimParams())
        print(f"Final month: {records[-1]}")
        return 0

    if cmd == "baseline":
        _print_sweep("Spec.md baseline (SellAllYearlyStrategy, 10 years):", baseline_scenarios())
        return 0

    if cmd == "sweep":
        _print_sweep(
            "LockThresholdStrategy sweep (10 years, 4 top-30 + 2 bottom start):",
            lock_threshold_scenarios(),
        )
        return 0

    if cmd == "emit-fixtures":
        out_dir = Path(argv[1]) if len(argv) > 1 else None
        paths = emit_fixtures(out_dir)
        print(f"Wrote {len(paths)} fixture files")
        for p in paths:
            print(f"  {p}")
        return 0

    if cmd == "plot":
        from pillar_sim.plots import plot_swap_sweep, plot_pillar_breakdown

        out_dir = Path(argv[1]) if len(argv) > 1 else Path("python/out")
        p1 = plot_swap_sweep(out_dir / "swap_sweep.png")
        p2 = plot_pillar_breakdown(
            out_dir / "pillar_breakdown_swap10.png",
            SimParams(swap_rate=10.0, strategy_name="lock_threshold", months=120),
        )
        p3 = plot_pillar_breakdown(
            out_dir / "pillar_breakdown_promote_swap10.png",
            SimParams(
                swap_rate=10.0,
                strategy_name="lock_threshold",
                months=120,
                promote_to_top30=True,
                max_promotions_per_year=1,
            ),
        )
        print(f"Wrote plots: {p1}, {p2}, {p3}")
        return 0

    print(f"unknown command: {cmd}", file=sys.stderr)
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
