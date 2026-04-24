import type { MonthRecord } from "../sim/state";

interface Row {
  rate: number;
  records: MonthRecord[];
}

interface Props {
  rows: Row[];
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function ScenarioTable({ rows }: Props) {
  return (
    <table>
      <thead>
        <tr>
          <th>Swap</th>
          <th>Launches</th>
          <th>Promos</th>
          <th>Top-30</th>
          <th>Bottom</th>
          <th>Total</th>
          <th>Next cost (QSR)</th>
          <th>QSR bal</th>
          <th>Self-deleg ZNN</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ rate, records }) => {
          const launches = records.reduce((s, r) => s + r.launches_this_month, 0);
          const promos = records.reduce((s, r) => s + r.promotions_this_month, 0);
          const f = records[records.length - 1]!;
          return (
            <tr key={rate}>
              <td>1:{rate}</td>
              <td>{launches}</td>
              <td>{promos}</td>
              <td>{f.pillars_top30}</td>
              <td>{f.pillars_bottom}</td>
              <td>{f.total_pillars}</td>
              <td>{fmt(f.next_qsr_cost)}</td>
              <td>{fmt(f.qsr_balance_end)}</td>
              <td>{fmt(f.znn_self_delegated_end)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
