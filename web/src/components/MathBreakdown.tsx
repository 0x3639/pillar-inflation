import type { SimParams } from "../sim/params";
import type { MonthRecord } from "../sim/state";
import {
  DAYS_PER_YEAR,
  MONTHS_PER_YEAR,
  delegationPoolDaily,
  networkTotalDelegation,
  operatorDelegationWeight,
  operatorKeepFraction,
  operatorSelfDelegationShare,
  operatorSelfDelegationWeight,
  perPillarDaily,
  poolDaily,
  totalBottom,
  totalTop30,
} from "../sim/rewards";

interface Props {
  params: SimParams;
  records: MonthRecord[];
}

function n(x: number, digits = 2): string {
  return x.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function n0(x: number): string {
  return Math.round(x).toLocaleString();
}

function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

interface RowProps {
  label: string;
  formula?: string;
  value: string;
  sub?: string;
}

function Row({ label, formula, value, sub }: RowProps) {
  return (
    <div className="math-row">
      <div className="math-label">{label}</div>
      {formula ? <div className="math-formula">{formula}</div> : null}
      <div className="math-value">{value}</div>
      {sub ? <div className="math-sub">{sub}</div> : null}
    </div>
  );
}

export function MathBreakdown({ params, records }: Props) {
  // Month-1 state = operator's starting values + initial competitor tier split.
  const op = {
    top30: params.start_top30,
    bottom: params.start_bottom,
    znn_balance: params.start_znn,
    qsr_balance: params.start_qsr,
    znn_self_delegated: 0,
    next_qsr_cost: params.start_next_qsr_cost,
  };
  const net = {
    competitor_top30: Math.max(params.top30_slots - op.top30, 0),
    competitor_bottom: Math.max(
      params.starting_total_pillars - params.top30_slots - op.bottom,
      0,
    ),
    months_elapsed: 0,
  };

  // --- Producing pool ---
  const [top30Pool, bottomPool] = poolDaily(params);
  const [perTop30Daily, perBottomDaily] = perPillarDaily(params, op, net);
  const opProducingDaily = op.top30 * perTop30Daily + op.bottom * perBottomDaily;
  const opProducingMonthlyGross = (opProducingDaily * DAYS_PER_YEAR) / MONTHS_PER_YEAR;

  // --- Delegation pool ---
  const delPoolDaily = delegationPoolDaily(params);
  const opDelegationWeight = operatorDelegationWeight(params, op);
  const opSelfWeight = operatorSelfDelegationWeight(params, op);
  const selfShare = operatorSelfDelegationShare(params, op);
  const netTotalDel = networkTotalDelegation(params, op, net);
  const opShareOfPool = netTotalDel > 0 ? opDelegationWeight / netTotalDel : 0;
  const delDailyGross =
    params.include_delegation_reward && opDelegationWeight > 0 ? delPoolDaily * opShareOfPool : 0;
  const delMonthlyGross = (delDailyGross * DAYS_PER_YEAR) / MONTHS_PER_YEAR;
  const netTop30 = totalTop30(op, net);
  const netBottom = totalBottom(op, net);

  // --- Keep fractions ---
  const keepMom = operatorKeepFraction(params.give_momentum_reward_pct, selfShare);
  const keepDel = operatorKeepFraction(params.give_delegation_reward_pct, selfShare);

  const producingMonthlyNet = opProducingMonthlyGross * keepMom;
  const delegationMonthlyNet = delMonthlyGross * keepDel;
  const totalMonthlyNet = producingMonthlyNet + delegationMonthlyNet;
  const annualNet = totalMonthlyNet * 12;

  // --- Swap math (per month at initial state) ---
  const reserve = params.znn_lock_per_pillar;
  const monthsToReserve = totalMonthlyNet > 0 ? reserve / totalMonthlyNet : Infinity;
  const monthsToNextLaunch = (() => {
    // After accumulating reserve, monthly surplus = totalMonthlyNet; QSR acquired
    // monthly = surplus * swap_rate; need next_qsr_cost QSR.
    if (totalMonthlyNet <= 0) return Infinity;
    const qsrPerMonth = totalMonthlyNet * params.swap_rate;
    return qsrPerMonth > 0 ? params.start_next_qsr_cost / qsrPerMonth : Infinity;
  })();

  // --- Simulation snapshots ---
  const snapAt = (year: number) => records[year * 12 - 1];
  const y1 = snapAt(1);
  const y5 = snapAt(5);
  const y10 = records[records.length - 1]!;

  return (
    <div className="math">
      <div className="math-section">
        <h3>Producing reward (50% pool)</h3>
        <Row
          label="Producing pool daily"
          formula={`${n0(params.znn_daily_emissions)} × ${params.pillar_pool_fraction} = `}
          value={`${n(params.znn_daily_emissions * params.pillar_pool_fraction)} ZNN/day`}
        />
        <Row
          label="Top-30 slice"
          formula={`${n(params.znn_daily_emissions * params.pillar_pool_fraction)} × ${params.top30_fraction} = `}
          value={`${n(top30Pool)} ZNN/day`}
        />
        <Row
          label="Bottom slice"
          value={`${n(bottomPool)} ZNN/day`}
        />
        <Row
          label="Per top-30 pillar / day"
          formula={`${n(top30Pool)} / ${params.top30_slots} = `}
          value={`${n(perTop30Daily, 3)} ZNN`}
        />
        <Row
          label="Per bottom pillar / day"
          formula={
            params.dilute_bottom_rewards
              ? `${n(bottomPool)} / ${n(netBottom, 1)} (live count) = `
              : `${n(bottomPool)} / ${params.starting_total_pillars - params.top30_slots} (fixed) = `
          }
          value={`${n(perBottomDaily, 3)} ZNN`}
          sub={
            params.dilute_bottom_rewards
              ? `live bottom count = operator ${op.bottom} + competitors ${n(net.competitor_bottom, 1)}`
              : undefined
          }
        />
        <Row
          label="Operator producing gross"
          formula={`(${op.top30} × ${n(perTop30Daily, 3)} + ${op.bottom} × ${n(perBottomDaily, 3)}) × 365 / 12 = `}
          value={`${n(opProducingMonthlyGross, 3)} ZNN/month`}
          sub={`= ${n0(opProducingMonthlyGross * 12)} ZNN/year gross`}
        />
      </div>

      <div className="math-section">
        <h3>Delegation reward (24% pool)</h3>
        {params.include_delegation_reward ? (
          <>
            <Row
              label="Delegation pool daily"
              formula={`${n0(params.znn_daily_emissions)} × ${params.delegation_pool_fraction} = `}
              value={`${n(delPoolDaily)} ZNN/day`}
            />
            <Row
              label="Operator delegation weight"
              formula={`${op.top30} × ${n0(params.pillar_total_delegation_top30)} + ${op.bottom} × ${n0(params.pillar_total_delegation_bottom)} = `}
              value={`${n0(opDelegationWeight)} ZNN`}
            />
            <Row
              label="Operator self-delegation weight"
              value={`${n0(opSelfWeight)} ZNN`}
            />
            <Row
              label="Operator self-share"
              formula={`${n0(opSelfWeight)} / ${n0(opDelegationWeight)} = `}
              value={pct(selfShare, 4)}
            />
            <Row
              label="Network total delegation (dynamic)"
              formula={`${n(netTop30, 0)} × ${n0(params.network_avg_top30_delegation)} + ${n(netBottom, 1)} × ${n0(params.network_avg_bottom_delegation)} = `}
              value={`${n0(netTotalDel)} ZNN`}
              sub="grows automatically as pillars are added"
            />
            <Row
              label="Operator share of delegation pool"
              formula={`${n0(opDelegationWeight)} / ${n0(netTotalDel)} = `}
              value={pct(opShareOfPool, 3)}
            />
            <Row
              label="Delegation gross"
              formula={`${n(delPoolDaily, 3)} × ${pct(opShareOfPool, 4)} × 365 / 12 = `}
              value={`${n(delMonthlyGross, 3)} ZNN/month`}
              sub={`= ${n0(delMonthlyGross * 12)} ZNN/year gross`}
            />
          </>
        ) : (
          <Row label="Delegation reward" value="disabled" />
        )}
      </div>

      <div className="math-section">
        <h3>Operator/delegator split</h3>
        <Row
          label="% momentum given to delegators"
          value={`${params.give_momentum_reward_pct}%`}
        />
        <Row
          label="% delegation given to delegators"
          value={`${params.give_delegation_reward_pct}%`}
        />
        <Row
          label="Momentum keep fraction"
          formula={`(1 − ${params.give_momentum_reward_pct / 100}) + ${params.give_momentum_reward_pct / 100} × ${n(selfShare, 4)} = `}
          value={pct(keepMom, 4)}
        />
        <Row
          label="Delegation keep fraction"
          formula={`(1 − ${params.give_delegation_reward_pct / 100}) + ${params.give_delegation_reward_pct / 100} × ${n(selfShare, 4)} = `}
          value={pct(keepDel, 4)}
        />
      </div>

      <div className="math-section">
        <h3>Net operator income (year 1 run-rate)</h3>
        <Row
          label="Producing net"
          formula={`${n(opProducingMonthlyGross, 3)} × ${pct(keepMom, 4)} = `}
          value={`${n(producingMonthlyNet, 3)} ZNN/month`}
        />
        <Row
          label="Delegation net"
          formula={`${n(delMonthlyGross, 3)} × ${pct(keepDel, 4)} = `}
          value={`${n(delegationMonthlyNet, 3)} ZNN/month`}
        />
        <Row
          label="Total net"
          value={`${n(totalMonthlyNet, 3)} ZNN/month`}
          sub={`= ${n0(annualNet)} ZNN/year`}
        />
      </div>

      <div className="math-section">
        <h3>Swap / launch dynamics (at initial state, steady state)</h3>
        <Row
          label="Months to accumulate 1 lock (15,000 ZNN)"
          formula={`${n0(params.znn_lock_per_pillar)} / ${n(totalMonthlyNet, 3)} = `}
          value={
            monthsToReserve === Infinity
              ? "never (no income)"
              : `${n(monthsToReserve, 2)} months`
          }
        />
        <Row
          label="After reserve, QSR acquired per month"
          formula={`${n(totalMonthlyNet, 3)} × ${params.swap_rate} = `}
          value={`${n(totalMonthlyNet * params.swap_rate, 2)} QSR/month`}
        />
        <Row
          label="Months to fund next launch"
          formula={`${n0(params.start_next_qsr_cost)} / ${n(totalMonthlyNet * params.swap_rate, 2)} = `}
          value={
            monthsToNextLaunch === Infinity
              ? "never"
              : `${n(monthsToNextLaunch, 2)} months`
          }
        />
      </div>

      <div className="math-section">
        <h3>Simulation snapshots</h3>
        <table>
          <thead>
            <tr>
              <th>Snapshot</th>
              <th>Top-30</th>
              <th>Bottom</th>
              <th>Net bottom total</th>
              <th>ZNN earned/mo</th>
              <th>Deleg portion</th>
              <th>Next cost</th>
              <th>Net total del</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "End of Y1", r: y1 },
              { name: "End of Y5", r: y5 },
              { name: `End of Y${Math.ceil(y10.month / 12)}`, r: y10 },
            ]
              .filter((x): x is { name: string; r: MonthRecord } => !!x.r)
              .map(({ name, r }) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{r.pillars_top30}</td>
                  <td>{r.pillars_bottom}</td>
                  <td>{n(r.competitor_bottom + r.pillars_bottom, 1)}</td>
                  <td>{n0(r.znn_earned_month)}</td>
                  <td>{n0(r.delegation_znn_month)}</td>
                  <td>{n0(r.next_qsr_cost)}</td>
                  <td>{n0(r.network_total_delegation)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
