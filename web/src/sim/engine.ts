import type { SimParams } from "./params";
import { monthlyZnnEarned, MONTHS_PER_YEAR, networkTotalDelegation } from "./rewards";
import type { MonthRecord, NetworkState, OperatorState } from "./state";
import { makeStrategy, type Strategy } from "./strategy";

export function simulate(params: SimParams, strategy?: Strategy): MonthRecord[] {
  const strat = strategy ?? makeStrategy(params.strategy_name);

  const operator: OperatorState = {
    top30: params.start_top30,
    bottom: params.start_bottom,
    znn_balance: params.start_znn,
    qsr_balance: params.start_qsr,
    znn_self_delegated: 0,
    next_qsr_cost: params.start_next_qsr_cost,
  };

  const network: NetworkState = {
    competitor_top30: Math.max(params.top30_slots - operator.top30, 0),
    competitor_bottom: Math.max(
      params.starting_total_pillars - params.top30_slots - operator.bottom,
      0,
    ),
    months_elapsed: 0,
  };

  const records: MonthRecord[] = [];
  const monthlyGrowth = params.network_growth_per_year / MONTHS_PER_YEAR;
  let growthAccumulator = 0;

  for (let month = 1; month <= params.months; month++) {
    growthAccumulator += monthlyGrowth;
    if (growthAccumulator >= 1) {
      const whole = Math.floor(growthAccumulator);
      network.competitor_bottom += whole;
      growthAccumulator -= whole;
    }
    network.months_elapsed = month;

    const { earned, perTop30, perBottom, delegationMonthly } = monthlyZnnEarned(
      params,
      operator,
      network,
    );
    operator.znn_balance += earned;

    const effects = strat.step(params, operator, network, month);

    if (operator.znn_balance < -1e-6) throw new Error(`znn negative at month ${month}`);
    if (operator.qsr_balance < -1e-6) throw new Error(`qsr negative at month ${month}`);
    if (operator.top30 > params.top30_slots) {
      throw new Error(`top30 exceeded cap at month ${month}`);
    }

    const year = Math.floor((month - 1) / 12) + 1;
    records.push({
      month,
      year,
      pillars_top30: operator.top30,
      pillars_bottom: operator.bottom,
      total_pillars: operator.top30 + operator.bottom,
      znn_balance_end: operator.znn_balance,
      qsr_balance_end: operator.qsr_balance,
      znn_self_delegated_end: operator.znn_self_delegated,
      znn_earned_month: earned,
      delegation_znn_month: delegationMonthly,
      znn_sold_month: effects.znn_sold,
      qsr_acquired_month: effects.qsr_acquired,
      qsr_spent_month: effects.qsr_spent,
      launches_this_month: effects.launches,
      promotions_this_month: effects.promotions,
      next_qsr_cost: operator.next_qsr_cost,
      per_top30_daily: perTop30,
      per_bottom_daily: perBottom,
      competitor_top30: network.competitor_top30,
      competitor_bottom: network.competitor_bottom,
      network_total_delegation: networkTotalDelegation(params, operator, network),
    });
  }

  return records;
}

export function yearEndRecords(records: MonthRecord[]): MonthRecord[] {
  return records.filter((r) => r.month % 12 === 0);
}
