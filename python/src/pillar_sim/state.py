from dataclasses import dataclass, asdict


@dataclass
class OperatorState:
    top30: int
    bottom: int
    znn_balance: float
    qsr_balance: float
    znn_self_delegated: float  # locked for top-30 promotions; not sellable
    next_qsr_cost: float

    @property
    def total_pillars(self) -> int:
        return self.top30 + self.bottom


@dataclass
class NetworkState:
    """Everyone on the network that ISN'T the operator. Kept separate for each
    tier so that dilution math and the delegation-pool share both use the
    correct live count."""

    competitor_top30: float
    competitor_bottom: float
    months_elapsed: int = 0

    def total_top30(self, operator: OperatorState) -> float:
        return self.competitor_top30 + operator.top30

    def total_bottom(self, operator: OperatorState) -> float:
        return self.competitor_bottom + operator.bottom


@dataclass
class MonthRecord:
    month: int  # 1-indexed
    year: int  # 1-indexed (month 1-12 -> year 1)
    pillars_top30: int
    pillars_bottom: int
    total_pillars: int
    znn_balance_end: float
    qsr_balance_end: float
    znn_self_delegated_end: float
    znn_earned_month: float
    delegation_znn_month: float
    znn_sold_month: float
    qsr_acquired_month: float
    qsr_spent_month: float
    launches_this_month: int
    promotions_this_month: int
    next_qsr_cost: float
    per_top30_daily: float
    per_bottom_daily: float
    competitor_top30: float
    competitor_bottom: float
    network_total_delegation: float  # computed dynamically

    def to_dict(self) -> dict:
        return asdict(self)
