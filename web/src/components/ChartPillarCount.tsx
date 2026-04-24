import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthRecord } from "../sim/state";

interface Props {
  records: MonthRecord[];
}

export function ChartPillarCount({ records }: Props) {
  const data = records.map((r) => ({
    month: r.month,
    year: (r.month / 12).toFixed(1),
    top30: r.pillars_top30,
    bottom: r.pillars_bottom,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--text-dim)", fontSize: 12 }}
          tickFormatter={(m: number) => `${(m / 12).toFixed(0)}y`}
          interval={11}
        />
        <YAxis
          tick={{ fill: "var(--text-dim)", fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elev-2)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--text)",
          }}
          labelFormatter={(m: number) => `Month ${m} (year ${((m - 1) / 12 + 1) | 0})`}
        />
        <Area
          type="stepAfter"
          dataKey="top30"
          stackId="1"
          stroke="var(--top30)"
          fill="var(--top30)"
          fillOpacity={0.7}
          name="Top-30"
        />
        <Area
          type="stepAfter"
          dataKey="bottom"
          stackId="1"
          stroke="var(--bottom)"
          fill="var(--bottom)"
          fillOpacity={0.6}
          name="Bottom"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
