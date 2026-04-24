import type { SimParams } from "./params";
import type { NetworkState, OperatorState } from "./state";

export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = 365;

export function poolDaily(params: SimParams): [number, number] {
  const pool = params.znn_daily_emissions * params.pillar_pool_fraction;
  const top30Pool = pool * params.top30_fraction;
  const bottomPool = pool - top30Pool;
  return [top30Pool, bottomPool];
}

export function totalTop30(operator: OperatorState, network: NetworkState): number {
  return network.competitor_top30 + operator.top30;
}

export function totalBottom(operator: OperatorState, network: NetworkState): number {
  return network.competitor_bottom + operator.bottom;
}

export function perPillarDaily(
  params: SimParams,
  operator: OperatorState,
  network: NetworkState,
): [number, number] {
  const [top30Pool, bottomPool] = poolDaily(params);
  const perTop30 = top30Pool / params.top30_slots;

  let perBottom: number;
  if (params.dilute_bottom_rewards) {
    const totalB = totalBottom(operator, network);
    perBottom = totalB > 0 ? bottomPool / totalB : 0;
  } else {
    const fixedBottom = Math.max(params.starting_total_pillars - params.top30_slots, 1);
    perBottom = bottomPool / fixedBottom;
  }

  return [perTop30, perBottom];
}

export function delegationPoolDaily(params: SimParams): number {
  return params.znn_daily_emissions * params.delegation_pool_fraction;
}

export function networkTotalDelegation(
  params: SimParams,
  operator: OperatorState,
  network: NetworkState,
): number {
  return (
    totalTop30(operator, network) * params.network_avg_top30_delegation +
    totalBottom(operator, network) * params.network_avg_bottom_delegation
  );
}

export function operatorDelegationWeight(params: SimParams, operator: OperatorState): number {
  return (
    operator.top30 * params.pillar_total_delegation_top30 +
    operator.bottom * params.pillar_total_delegation_bottom
  );
}

export function operatorSelfDelegationWeight(
  params: SimParams,
  operator: OperatorState,
): number {
  return (
    operator.top30 * params.pillar_self_delegation_top30 +
    operator.bottom * params.pillar_self_delegation_bottom
  );
}

export function operatorSelfDelegationShare(
  params: SimParams,
  operator: OperatorState,
): number {
  const total = operatorDelegationWeight(params, operator);
  if (total <= 0) return 1;
  return operatorSelfDelegationWeight(params, operator) / total;
}

export function delegationZnnDaily(
  params: SimParams,
  operator: OperatorState,
  network: NetworkState,
): number {
  if (!params.include_delegation_reward) return 0;
  const opWeight = operatorDelegationWeight(params, operator);
  if (opWeight <= 0) return 0;
  const netTotal = networkTotalDelegation(params, operator, network);
  if (netTotal <= 0) return 0;
  return delegationPoolDaily(params) * (opWeight / netTotal);
}

export function operatorKeepFraction(giveToDelegatorsPct: number, selfShare: number): number {
  const give = giveToDelegatorsPct / 100;
  return 1 - give + give * selfShare;
}

export function monthlyZnnEarned(
  params: SimParams,
  operator: OperatorState,
  network: NetworkState,
): { earned: number; perTop30: number; perBottom: number; delegationMonthly: number } {
  const [perTop30, perBottom] = perPillarDaily(params, operator, network);
  const producingDaily = operator.top30 * perTop30 + operator.bottom * perBottom;
  const producingGross = (producingDaily * DAYS_PER_YEAR) / MONTHS_PER_YEAR;
  const delegationGross =
    (delegationZnnDaily(params, operator, network) * DAYS_PER_YEAR) / MONTHS_PER_YEAR;

  const selfShare = operatorSelfDelegationShare(params, operator);
  const producingKeep = operatorKeepFraction(params.give_momentum_reward_pct, selfShare);
  const delegationKeep = operatorKeepFraction(params.give_delegation_reward_pct, selfShare);

  const producingNet = producingGross * producingKeep;
  const delegationNet = delegationGross * delegationKeep;
  return {
    earned: producingNet + delegationNet,
    perTop30,
    perBottom,
    delegationMonthly: delegationNet,
  };
}
