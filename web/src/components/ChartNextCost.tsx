import {
  CartesianGrid,
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

export function ChartNextCost({ records }: Props) {
  const data = records.map((r) => ({
    month: r.month,
    next_cost: r.next_qsr_cost,
    launched: r.launches_this_month > 0,
    launches: r.launches_this_month,
  }));

  // Launch events — highlighted points where the cost stepped up.
  const launchEvents = records
    .filter((r) => r.launches_this_month > 0)
    .map((r) => ({
      month: r.month,
      cost: r.next_qsr_cost,
    }));

  const startingCost = records[0]?.next_qsr_cost ?? 0;
  const finalCost = records[records.length - 1]?.next_qsr_cost ?? 0;

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
          Starts at <strong style={{ color: "var(--text)" }}>{startingCost.toLocaleString()}</strong> QSR
        </span>
        <span>
          Ends at <strong style={{ color: "var(--text)" }}>{finalCost.toLocaleString()}</strong> QSR
        </span>
        <span>
          <strong style={{ color: "var(--accent)" }}>{launchEvents.length}</strong> launches → each +10,000
          QSR
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--text-dim)", fontSize: 12 }}
            tickFormatter={(m: number) => `${Math.round(m / 12)}y`}
            interval={11}
            label={{
              value: "Month (years marked)",
              position: "insideBottom",
              offset: -10,
              fill: "var(--text-dim)",
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{ fill: "var(--text-dim)", fontSize: 12 }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            domain={[
              (dataMin: number) => Math.floor(dataMin / 10000) * 10000 - 5000,
              (dataMax: number) => Math.ceil(dataMax / 10000) * 10000 + 5000,
            ]}
            label={{
              value: "Next pillar cost (QSR)",
              angle: -90,
              position: "insideLeft",
              fill: "var(--text-dim)",
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
            formatter={(v: number, _k, item) => {
              const launched = (item?.payload as { launched?: boolean })?.launched;
              return [
                `${v.toLocaleString()} QSR${launched ? " (launched this month)" : ""}`,
                "Next cost",
              ];
            }}
          />
          <Line
            type="stepAfter"
            dataKey="next_cost"
            stroke="var(--warn)"
            strokeWidth={2}
            dot={{ r: 1.5, fill: "var(--warn)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            name="Next pillar cost"
            isAnimationActive={false}
          />
          {launchEvents.map((e) => (
            <ReferenceDot
              key={e.month}
              x={e.month}
              y={e.cost}
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
        Green dots mark launch events. Cost holds flat between launches and steps up by 10,000
        QSR at each launch.
      </div>
    </div>
  );
}
