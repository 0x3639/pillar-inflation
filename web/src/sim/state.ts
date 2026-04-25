export interface OperatorState {
  top30: number;
  bottom: number;
  znn_balance: number;
  qsr_balance: number;
  znn_self_delegated: number;
  next_qsr_cost: number;
}

export interface NetworkState {
  competitor_top30: number;
  competitor_bottom: number;
  months_elapsed: number;
}

export interface MonthRecord {
  month: number;
  year: number;
  pillars_top30: number;
  pillars_bottom: number;
  total_pillars: number;
  znn_balance_end: number;
  qsr_balance_end: number;
  qsr_peak_month: number;
  znn_self_delegated_end: number;
  znn_earned_month: number;
  delegation_znn_month: number;
  znn_sold_month: number;
  qsr_acquired_month: number;
  qsr_spent_month: number;
  launches_this_month: number;
  promotions_this_month: number;
  next_qsr_cost: number;
  per_top30_daily: number;
  per_bottom_daily: number;
  competitor_top30: number;
  competitor_bottom: number;
  network_total_delegation: number;
}
