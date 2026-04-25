import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthRecord } from "../sim/state";

interface Props {
  records: MonthRecord[];
}

export function ChartFlows({ records }: Props) {
  let cumProducing = 0;
  let cumDelegation = 0;
  let cumSold = 0;
  let cumQsrAcquired = 0;
  let cumQsrSpent = 0;
  const data = records.map((r) => {
    const producing = r.znn_earned_month - r.delegation_znn_month;
    cumProducing += producing;
    cumDelegation += r.delegation_znn_month;
    cumSold += r.znn_sold_month;
    cumQsrAcquired += r.qsr_acquired_month;
    cumQsrSpent += r.qsr_spent_month;
    return {
      month: r.month,
      producing: cumProducing,
      delegation: cumDelegation,
      sold: cumSold,
      qsr_acquired: cumQsrAcquired,
      qsr_spent: cumQsrSpent,
    };
  });

  const final = data[data.length - 1]!;

  const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.5rem 1rem",
          marginBottom: "0.5rem",
          fontSize: "0.85rem",
          color: "var(--text-dim)",
        }}
      >
        <span>
          Producing ZNN earned:{" "}
          <strong style={{ color: "var(--accent)" }}>{fmt(final.producing)}</strong>
        </span>
        <span>
          Delegation ZNN earned:{" "}
          <strong style={{ color: "var(--warn)" }}>{fmt(final.delegation)}</strong>
        </span>
        <span>
          ZNN sold for QSR:{" "}
          <strong style={{ color: "var(--bottom)" }}>{fmt(final.sold)}</strong>
        </span>
        <span>
          QSR acquired:{" "}
          <strong style={{ color: "#9e7ee3" }}>{fmt(final.qsr_acquired)}</strong>
        </span>
        <span>
          QSR burned on launches:{" "}
          <strong style={{ color: "var(--danger)" }}>{fmt(final.qsr_spent)}</strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 56, left: 8, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--text-dim)", fontSize: 12 }}
            tickFormatter={(m: number) => `${Math.round(m / 12)}y`}
            interval={11}
            label={{
              value: "Month",
              position: "insideBottom",
              offset: -10,
              fill: "var(--text-dim)",
              fontSize: 12,
            }}
          />
          <YAxis
            yAxisId="znn"
            tick={{ fill: "var(--text-dim)", fontSize: 12 }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            label={{
              value: "Cumulative ZNN",
              angle: -90,
              position: "insideLeft",
              fill: "var(--accent)",
              fontSize: 12,
            }}
          />
          <YAxis
            yAxisId="qsr"
            orientation="right"
            tick={{ fill: "var(--text-dim)", fontSize: 12 }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            label={{
              value: "Cumulative QSR",
              angle: 90,
              position: "insideRight",
              fill: "#9e7ee3",
              fontSize: 12,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elev-2)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              color: "var(--text)",
            }}
            labelFormatter={(m: number) =>
              `Month ${m} (year ${Math.floor((m - 1) / 12) + 1})`
            }
            formatter={(v: number) => fmt(v)}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ color: "var(--text)", fontSize: 12, bottom: 0 }}
          />
          <Line
            yAxisId="znn"
            type="monotone"
            dataKey="producing"
            name="ZNN earned — producing"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="znn"
            type="monotone"
            dataKey="delegation"
            name="ZNN earned — delegation"
            stroke="var(--warn)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="znn"
            type="monotone"
            dataKey="sold"
            name="ZNN sold for QSR"
            stroke="var(--bottom)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="qsr"
            type="monotone"
            dataKey="qsr_acquired"
            name="QSR acquired (from selling ZNN)"
            stroke="#9e7ee3"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="qsr"
            type="monotone"
            dataKey="qsr_spent"
            name="QSR burned (on pillar launches)"
            stroke="var(--danger)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
