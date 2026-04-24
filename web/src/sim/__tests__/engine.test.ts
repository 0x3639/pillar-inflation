import { describe, it, expect } from "vitest";
import { simulate } from "../engine";
import type { SimParams } from "../params";
import type { MonthRecord } from "../state";
import index from "@fixtures/index.json";

interface Fixture {
  name: string;
  params: SimParams;
  records: MonthRecord[];
}

const fixtureModules = import.meta.glob<{ default: Fixture }>("@fixtures/*.json", {
  eager: true,
});

const fixtures: Record<string, Fixture> = {};
for (const [path, mod] of Object.entries(fixtureModules)) {
  const name = path.split("/").pop()!.replace(/\.json$/, "");
  if (name === "index") continue;
  fixtures[name] = mod.default;
}

const FLOAT_TOL = 1e-6;

function assertRecordsEqual(a: MonthRecord[], b: MonthRecord[], scenarioName: string): void {
  expect(a.length, `${scenarioName}: length`).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    const ra = a[i]!;
    const rb = b[i]!;
    // ints — exact
    const intKeys = [
      "month",
      "year",
      "pillars_top30",
      "pillars_bottom",
      "total_pillars",
      "launches_this_month",
      "promotions_this_month",
    ] as const;
    for (const k of intKeys) {
      expect(ra[k], `${scenarioName} month ${ra.month} ${k}`).toBe(rb[k]);
    }
    // floats — tolerance
    const floatKeys = [
      "znn_balance_end",
      "qsr_balance_end",
      "znn_self_delegated_end",
      "znn_earned_month",
      "delegation_znn_month",
      "znn_sold_month",
      "qsr_acquired_month",
      "qsr_spent_month",
      "next_qsr_cost",
      "per_top30_daily",
      "per_bottom_daily",
      "competitor_top30",
      "competitor_bottom",
      "network_total_delegation",
    ] as const;
    for (const k of floatKeys) {
      const diff = Math.abs(ra[k] - rb[k]);
      expect(diff, `${scenarioName} month ${ra.month} ${k}: ${ra[k]} vs ${rb[k]}`).toBeLessThan(
        FLOAT_TOL,
      );
    }
  }
}

describe("TS engine matches Python golden fixtures", () => {
  it("index enumerates all expected fixtures", () => {
    const expected = new Set((index as { fixtures: string[] }).fixtures);
    const actual = new Set(Object.keys(fixtures));
    expect(actual).toEqual(expected);
  });

  for (const name of (index as { fixtures: string[] }).fixtures) {
    it(`matches fixture: ${name}`, () => {
      const fx = fixtures[name]!;
      const tsRecords = simulate(fx.params);
      assertRecordsEqual(tsRecords, fx.records, name);
    });
  }
});
