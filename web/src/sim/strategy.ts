import type { SimParams } from "./params";
import type { NetworkState, OperatorState } from "./state";

export interface MonthlyEffects {
  znn_sold: number;
  qsr_acquired: number;
  qsr_spent: number;
  launches: number;
  promotions: number;
  qsr_peak: number;
}

export interface Strategy {
  step(
    params: SimParams,
    operator: OperatorState,
    network: NetworkState,
    month: number,
  ): MonthlyEffects;
}

function emptyEffects(): MonthlyEffects {
  return { znn_sold: 0, qsr_acquired: 0, qsr_spent: 0, launches: 0, promotions: 0, qsr_peak: 0 };
}

function effectiveTop30Cap(params: SimParams): number {
  return Math.min(params.top30_slots, params.operator_max_top30);
}

function tryLaunch(params: SimParams, operator: OperatorState, effects: MonthlyEffects): void {
  operator.qsr_balance -= operator.next_qsr_cost;
  effects.qsr_spent += operator.next_qsr_cost;
  operator.znn_balance -= params.znn_lock_per_pillar;
  operator.bottom += 1;
  operator.next_qsr_cost += params.qsr_cost_step;
  effects.launches += 1;
}

function tryPromote(
  params: SimParams,
  operator: OperatorState,
  effects: MonthlyEffects,
  maxThisCycle: number,
): void {
  const cap = effectiveTop30Cap(params);
  let promoted = 0;
  while (
    promoted < maxThisCycle &&
    operator.znn_balance >= params.top30_delegation_threshold &&
    operator.bottom > 0 &&
    operator.top30 < cap
  ) {
    operator.znn_balance -= params.top30_delegation_threshold;
    operator.znn_self_delegated += params.top30_delegation_threshold;
    operator.bottom -= 1;
    operator.top30 += 1;
    promoted += 1;
    effects.promotions += 1;
  }
}

export class LockThresholdStrategy implements Strategy {
  step(
    params: SimParams,
    operator: OperatorState,
    _network: NetworkState,
    month: number,
  ): MonthlyEffects {
    const effects = emptyEffects();

    let reserve = params.znn_lock_per_pillar;
    if (params.promote_to_top30 && operator.bottom > 0) {
      reserve += params.top30_delegation_threshold * params.max_promotions_per_year;
    }

    if (operator.znn_balance > reserve) {
      const surplus = operator.znn_balance - reserve;
      operator.znn_balance -= surplus;
      operator.qsr_balance += surplus * params.swap_rate;
      effects.znn_sold += surplus;
      effects.qsr_acquired += surplus * params.swap_rate;
    }

    effects.qsr_peak = operator.qsr_balance;

    while (
      operator.qsr_balance >= operator.next_qsr_cost &&
      operator.znn_balance >= params.znn_lock_per_pillar
    ) {
      tryLaunch(params, operator, effects);
    }

    if (params.promote_to_top30 && month % 12 === 0) {
      tryPromote(params, operator, effects, params.max_promotions_per_year);
    }

    return effects;
  }
}

export class SellAllYearlyStrategy implements Strategy {
  step(
    params: SimParams,
    operator: OperatorState,
    _network: NetworkState,
    month: number,
  ): MonthlyEffects {
    const effects = emptyEffects();
    if (month % 12 !== 0) {
      effects.qsr_peak = operator.qsr_balance;
      return effects;
    }

    const znnBal = operator.znn_balance;
    const nextCost = operator.next_qsr_cost;
    const qsrBal = operator.qsr_balance;

    const feasible = (k: number): boolean => {
      const locks = k * params.znn_lock_per_pillar;
      const sellable = znnBal - locks;
      if (sellable < 0) return false;
      let qsrTotal = 0;
      for (let i = 0; i < k; i++) {
        qsrTotal += nextCost + params.qsr_cost_step * i;
      }
      return qsrBal + sellable * params.swap_rate >= qsrTotal;
    };

    let k = 0;
    while (feasible(k + 1)) k++;

    const znnToSell = znnBal - k * params.znn_lock_per_pillar;
    const qsrAcquired = znnToSell * params.swap_rate;

    operator.znn_balance -= znnToSell;
    operator.qsr_balance += qsrAcquired;
    effects.znn_sold += znnToSell;
    effects.qsr_acquired += qsrAcquired;

    effects.qsr_peak = operator.qsr_balance;

    for (let i = 0; i < k; i++) {
      tryLaunch(params, operator, effects);
    }

    if (params.promote_to_top30) {
      tryPromote(params, operator, effects, params.max_promotions_per_year);
    }

    return effects;
  }
}

export function makeStrategy(name: string): Strategy {
  if (name === "lock_threshold") return new LockThresholdStrategy();
  if (name === "sell_all_yearly") return new SellAllYearlyStrategy();
  throw new Error(`unknown strategy: ${name}`);
}
