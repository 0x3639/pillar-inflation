export type StrategyName = "lock_threshold" | "sell_all_yearly";

export interface SimParams {
  // Network
  znn_daily_emissions: number;
  qsr_daily_emissions: number;
  pillar_pool_fraction: number;
  top30_fraction: number;
  top30_slots: number;
  znn_lock_per_pillar: number;
  top30_delegation_threshold: number;
  qsr_cost_step: number;
  starting_total_pillars: number;

  // Operator starting state
  start_top30: number;
  start_bottom: number;
  start_next_qsr_cost: number;
  start_znn: number;
  start_qsr: number;

  // Run
  months: number;
  swap_rate: number;

  // Strategy
  strategy_name: StrategyName;
  promote_to_top30: boolean;
  max_promotions_per_year: number;
  operator_max_top30: number;

  // Extensions
  dilute_bottom_rewards: boolean;
  network_growth_per_year: number;

  // Delegation reward (24% of daily emissions)
  include_delegation_reward: boolean;
  delegation_pool_fraction: number;
  pillar_total_delegation_top30: number;
  pillar_self_delegation_top30: number;
  pillar_total_delegation_bottom: number;
  pillar_self_delegation_bottom: number;

  // Dynamic network-delegation model
  network_avg_top30_delegation: number;
  network_avg_bottom_delegation: number;

  // Operator/delegator reward split ("Momentum / Delegate rewards %")
  give_momentum_reward_pct: number;
  give_delegation_reward_pct: number;
}

export const DEFAULT_PARAMS: SimParams = {
  znn_daily_emissions: 4320,
  qsr_daily_emissions: 5000,
  pillar_pool_fraction: 0.5,
  top30_fraction: 0.4,
  top30_slots: 30,
  znn_lock_per_pillar: 15_000,
  top30_delegation_threshold: 95_000,
  qsr_cost_step: 10_000,
  starting_total_pillars: 97,
  start_top30: 4,
  start_bottom: 2,
  start_next_qsr_cost: 330_000,
  start_znn: 0,
  start_qsr: 0,
  months: 120,
  swap_rate: 5,
  strategy_name: "lock_threshold",
  promote_to_top30: false,
  max_promotions_per_year: 1,
  operator_max_top30: 30,
  dilute_bottom_rewards: true,
  network_growth_per_year: 0,
  include_delegation_reward: true,
  delegation_pool_fraction: 0.24,
  pillar_total_delegation_top30: 150_000,
  pillar_self_delegation_top30: 100_000,
  pillar_total_delegation_bottom: 0,
  pillar_self_delegation_bottom: 0,
  network_avg_top30_delegation: 150_000,
  network_avg_bottom_delegation: 0,
  give_momentum_reward_pct: 55,
  give_delegation_reward_pct: 100,
};
