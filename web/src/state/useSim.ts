import { useMemo } from "react";
import { simulate } from "../sim/engine";
import type { SimParams } from "../sim/params";
import type { MonthRecord } from "../sim/state";

export interface SimSummary {
  totalLaunches: number;
  totalPromotions: number;
  finalTop30: number;
  finalBottom: number;
  finalTotal: number;
  finalNextCost: number;
  finalZnnSelfDelegated: number;
}

export function useSim(params: SimParams): { records: MonthRecord[]; summary: SimSummary } {
  return useMemo(() => {
    const records = simulate(params);
    const totalLaunches = records.reduce((s, r) => s + r.launches_this_month, 0);
    const totalPromotions = records.reduce((s, r) => s + r.promotions_this_month, 0);
    const final = records[records.length - 1]!;
    return {
      records,
      summary: {
        totalLaunches,
        totalPromotions,
        finalTop30: final.pillars_top30,
        finalBottom: final.pillars_bottom,
        finalTotal: final.total_pillars,
        finalNextCost: final.next_qsr_cost,
        finalZnnSelfDelegated: final.znn_self_delegated_end,
      },
    };
  }, [params]);
}

export function useSwapSweep(
  baseParams: SimParams,
  rates: number[],
): Array<{ rate: number; records: MonthRecord[]; summary: SimSummary }> {
  return useMemo(
    () =>
      rates.map((rate) => {
        const p = { ...baseParams, swap_rate: rate };
        const records = simulate(p);
        const final = records[records.length - 1]!;
        const totalLaunches = records.reduce((s, r) => s + r.launches_this_month, 0);
        const totalPromotions = records.reduce((s, r) => s + r.promotions_this_month, 0);
        return {
          rate,
          records,
          summary: {
            totalLaunches,
            totalPromotions,
            finalTop30: final.pillars_top30,
            finalBottom: final.pillars_bottom,
            finalTotal: final.total_pillars,
            finalNextCost: final.next_qsr_cost,
            finalZnnSelfDelegated: final.znn_self_delegated_end,
          },
        };
      }),
    [baseParams, rates],
  );
}
