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
import type { SimParams } from "../sim/params";
import type { MonthRecord } from "../sim/state";

interface Props {
  params: SimParams;
  records: MonthRecord[];
}

const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;

export function ChartInflationShare({ params, records }: Props) {
  // Network mints this much each month regardless of operator activity.
  const znnMintedPerMonth = (params.znn_daily_emissions * DAYS_PER_YEAR) / MONTHS_PER_YEAR;
  const qsrMintedPerMonth = (params.qsr_daily_emissions * DAYS_PER_YEAR) / MONTHS_PER_YEAR;

  let cumZnnOperator = 0;
  let cumQsrOperator = 0;
  let cumZnnMinted = 0;
  let cumQsrMinted = 0;

  const data = records.map((r) => {
    cumZnnOperator += r.znn_earned_month;
    cumQsrOperator += r.qsr_acquired_month;
    cumZnnMinted += znnMintedPerMonth;
    cumQsrMinted += qsrMintedPerMonth;
    return {
      month: r.month,
      znn_share: cumZnnMinted > 0 ? (cumZnnOperator / cumZnnMinted) * 100 : 0,
      qsr_share: cumQsrMinted > 0 ? (cumQsrOperator / cumQsrMinted) * 100 : 0,
      znn_operator: cumZnnOperator,
      qsr_operator: cumQsrOperator,
      znn_minted: cumZnnMinted,
      qsr_minted: cumQsrMinted,
    };
  });

  const final = data[data.length - 1]!;
  const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.5rem 1rem",
          marginBottom: "0.5rem",
          fontSize: "0.85rem",
          color: "var(--text-dim)",
        }}
      >
        <span>
          Final ZNN share:{" "}
          <strong style={{ color: "var(--top30)" }}>{final.znn_share.toFixed(2)}%</strong>{" "}
          <span style={{ opacity: 0.7 }}>
            ({fmt(final.znn_operator)} / {fmt(final.znn_minted)})
          </span>
        </span>
        <span>
          Final QSR share:{" "}
          <strong style={{ color: "#9e7ee3" }}>{final.qsr_share.toFixed(2)}%</strong>{" "}
          <span style={{ opacity: 0.7 }}>
            ({fmt(final.qsr_operator)} / {fmt(final.qsr_minted)})
          </span>
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
              value: "Month",
              position: "insideBottom",
              offset: -10,
              fill: "var(--text-dim)",
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{ fill: "var(--text-dim)", fontSize: 12 }}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            label={{
              value: "Operator share of total inflation",
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
            formatter={(v: number, name: string) => [`${v.toFixed(3)}%`, name]}
          />
          <Legend wrapperStyle={{ color: "var(--text)", fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="znn_share"
            name="ZNN earned ÷ ZNN minted"
            stroke="var(--top30)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="qsr_share"
            name="QSR purchased ÷ QSR minted"
            stroke="#9e7ee3"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div
        style={{
          fontSize: "0.78rem",
          color: "var(--text-dim)",
          marginTop: "0.5rem",
        }}
      >
        Numerator is cumulative ZNN he earned (or QSR he acquired via swap). Denominator is
        cumulative network inflation over the same period: {params.znn_daily_emissions} ZNN/day
        and {params.qsr_daily_emissions} QSR/day. As he adds pillars both ratios trend upward.
      </div>
    </div>
  );
}
