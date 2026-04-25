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

interface Series {
  rate: number;
  records: MonthRecord[];
}

interface Props {
  series: Series[];
  yKey: "total_pillars" | "pillars_top30";
  ylabel: string;
}

const COLORS = [
  "#55d18a",
  "#4a8bd6",
  "#f2b544",
  "#e36b6b",
  "#9e7ee3",
  "#6fd7d0",
  "#d67ea6",
  "#b3d66f",
];

export function ChartSwapSweep({ series, yKey, ylabel }: Props) {
  const maxMonths = Math.max(...series.map((s) => s.records.length));
  const data = Array.from({ length: maxMonths }, (_, i) => {
    const row: Record<string, number> = { month: i + 1 };
    for (const s of series) {
      row[`r${s.rate}`] = s.records[i]?.[yKey] ?? 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--text-dim)", fontSize: 12 }}
          tickFormatter={(m: number) => `${(m / 12).toFixed(0)}y`}
          interval={11}
        />
        <YAxis tick={{ fill: "var(--text-dim)", fontSize: 12 }} allowDecimals={false} label={{ value: ylabel, angle: -90, fill: "var(--text-dim)", fontSize: 12, position: "insideLeft" }}/>
        <Tooltip
          contentStyle={{
            background: "var(--bg-elev-2)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--text)",
          }}
          labelFormatter={(m: number) => `Month ${m} (year ${((m - 1) / 12 + 1) | 0})`}
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ color: "var(--text)", fontSize: 12, bottom: 0 }}
        />
        {series.map((s, i) => (
          <Line
            key={s.rate}
            type="monotone"
            dataKey={`r${s.rate}`}
            name={`1:${s.rate}`}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
