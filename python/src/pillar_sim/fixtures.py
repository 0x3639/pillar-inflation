"""Emit golden-value JSON fixtures used by the TS port to detect engine drift."""

import json
from dataclasses import asdict
from pathlib import Path

from pillar_sim.engine import simulate
from pillar_sim.scenarios import all_fixture_scenarios


REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_DIR = REPO_ROOT / "shared" / "fixtures"


def emit(out_dir: Path | None = None) -> list[Path]:
    target = out_dir or FIXTURES_DIR
    target.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    scenarios = all_fixture_scenarios()

    for name, params in scenarios.items():
        records = simulate(params)
        payload = {
            "name": name,
            "params": params.to_dict(),
            "records": [asdict(r) for r in records],
        }
        path = target / f"{name}.json"
        path.write_text(json.dumps(payload, indent=2))
        written.append(path)

    # Index file so TS test runner can enumerate without filesystem globbing.
    index = {"fixtures": sorted(s for s in scenarios)}
    (target / "index.json").write_text(json.dumps(index, indent=2))
    written.append(target / "index.json")
    return written
