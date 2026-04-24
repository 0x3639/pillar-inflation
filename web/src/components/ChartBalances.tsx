import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthRecord } from "../sim/state";

interface Props {
  records: MonthRecord[];
}

export function ChartBalances({ records }: Props) {
  const data = records.map((r) => ({
    month: r.month,
    znn: r.znn_balance_end,
    qsr: r.qsr_balance_end,
    self_del: r.znn_self_delegated_end,
    launched: r.launches_this_month > 0,
  }));

  const launchEvents = records
    .filter((r) => r.launches_this_month > 0)
    .map((r) => ({ month: r.month, znn: r.znn_balance_end, qsr: r.qsr_balance_end }));

  const anySelfDel = records.some((r) => r.znn_self_delegated_end > 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "0.5rem",
          fontSize: "0.85rem",
          color: "var(--text-dim)",
        }}
      >
        <span>
          <strong style={{ color: "var(--top30)" }}>● ZNN</strong> balance (left axis)
        </span>
        <span>
          <strong style={{ color: "var(--bottom)" }}>● QSR</strong> balance (right axis)
        </span>
        {anySelfDel ? (
          <span>
            <strong style={{ color: "var(--warn)" }}>● Self-delegated ZNN</strong> (left axis,
            locked)
          </span>
        ) : null}
        <span>
          <strong style={{ color: "var(--accent)" }}>● Launch</strong> events
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 56, left: 8, bottom: 24 }}>
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
              value: "ZNN balance",
              angle: -90,
              position: "insideLeft",
              fill: "var(--top30)",
              fontSize: 12,
            }}
          />
          <YAxis
            yAxisId="qsr"
            orientation="right"
            tick={{ fill: "var(--text-dim)", fontSize: 12 }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            label={{
              value: "QSR balance",
              angle: 90,
              position: "insideRight",
              fill: "var(--bottom)",
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
            formatter={(v: number, name: string) => [
              v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
              name,
            ]}
          />
          <Legend wrapperStyle={{ color: "var(--text)", fontSize: 12 }} />
          <Line
            yAxisId="znn"
            type="linear"
            dataKey="znn"
            name="ZNN balance"
            stroke="var(--top30)"
            strokeWidth={2}
            dot={{ r: 1.5, fill: "var(--top30)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          {anySelfDel ? (
            <Line
              yAxisId="znn"
              type="linear"
              dataKey="self_del"
              name="Self-delegated ZNN"
              stroke="var(--warn)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          ) : null}
          <Line
            yAxisId="qsr"
            type="linear"
            dataKey="qsr"
            name="QSR balance"
            stroke="var(--bottom)"
            strokeWidth={2}
            dot={{ r: 1.5, fill: "var(--bottom)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          {launchEvents.map((e) => (
            <ReferenceDot
              key={`znn-${e.month}`}
              yAxisId="znn"
              x={e.month}
              y={e.znn}
              r={5}
              fill="var(--accent)"
              stroke="var(--bg-elev)"
              strokeWidth={2}
              isFront
            />
          ))}
          {launchEvents.map((e) => (
            <ReferenceDot
              key={`qsr-${e.month}`}
              yAxisId="qsr"
              x={e.month}
              y={e.qsr}
              r={5}
              fill="var(--accent)"
              stroke="var(--bg-elev)"
              strokeWidth={2}
              isFront
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div
        style={{
          fontSize: "0.78rem",
          color: "var(--text-dim)",
          marginTop: "0.5rem",
        }}
      >
        ZNN accumulates to 15,000 (the lock reserve), then surplus is sold monthly for QSR. At
        each green-dot launch, 15,000 ZNN is locked (balance drops) and <em>next_qsr_cost</em>{" "}
        QSR is burned. Any residual carries to next month.
      </div>
    </div>
  );
}
