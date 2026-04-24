import { ChartBalances } from "./components/ChartBalances";
import { ChartFlows } from "./components/ChartFlows";
import { ChartInflationShare } from "./components/ChartInflationShare";
import { ChartNextCost } from "./components/ChartNextCost";
import { ChartPillarCount } from "./components/ChartPillarCount";
import { ChartSwapSweep } from "./components/ChartSwapSweep";
import { MathBreakdown } from "./components/MathBreakdown";
import { ParamsPanel } from "./components/ParamsPanel";
import { ScenarioTable } from "./components/ScenarioTable";
import { useParamsStore } from "./state/useParamsStore";
import { useSim, useSwapSweep } from "./state/useSim";

const SWEEP_RATES = [3, 4, 5, 6, 7, 8, 9, 10];

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

export function App() {
  const params = useParamsStore((s) => s.params);
  const sweepMode = useParamsStore((s) => s.sweepMode);
  const { records, summary } = useSim(params);
  const sweep = useSwapSweep(params, SWEEP_RATES);

  const top30Pct = ((summary.finalTop30 / params.top30_slots) * 100).toFixed(0);

  return (
    <div className="app">
      <aside className="sidebar">
        <ParamsPanel />
      </aside>

      <main className="content">
        <div className="header">
          <div>
            <h1 style={{ margin: 0 }}>Pillar accumulation</h1>
            <div className="subtitle">
              {params.strategy_name === "lock_threshold"
                ? "Monthly tick — accumulate to 15k ZNN, then sell surplus for QSR"
                : "Yearly tick — skeleton baseline"}
              {" · "}
              swap 1:{params.swap_rate}
              {" · "}
              {params.months} months
            </div>
          </div>
        </div>

        <div className="kpi-grid">
          <Kpi
            label="Top-30 pillars"
            value={summary.finalTop30}
            sub={`${top30Pct}% of top-30 slots`}
          />
          <Kpi label="Bottom pillars" value={summary.finalBottom} />
          <Kpi label="Pillars launched" value={summary.totalLaunches} />
          <Kpi label="Promotions" value={summary.totalPromotions} />
          <Kpi
            label="Next pillar cost"
            value={Math.round(summary.finalNextCost).toLocaleString()}
            sub="QSR"
          />
          <Kpi
            label="ZNN self-delegated"
            value={Math.round(summary.finalZnnSelfDelegated).toLocaleString()}
            sub="locked for top-30 promotions"
          />
        </div>

        <section className="chart-card">
          <h2>Operator pillar count over time</h2>
          <div className="chart-subtitle">Stacked: top-30 + bottom.</div>
          <ChartPillarCount records={records} />
        </section>

        {sweepMode ? (
          <>
            <section className="chart-card">
              <h2>Total pillars by swap rate</h2>
              <div className="chart-subtitle">
                One line per ZNN→QSR swap rate, all other parameters held fixed.
              </div>
              <ChartSwapSweep series={sweep} yKey="total_pillars" ylabel="Total pillars" />
            </section>
            <section className="chart-card">
              <h2>Top-30 pillars by swap rate</h2>
              <ChartSwapSweep series={sweep} yKey="pillars_top30" ylabel="Top-30 count" />
            </section>
            <section className="chart-card">
              <h2>Scenario summary (10-year final state)</h2>
              <ScenarioTable rows={sweep.map((s) => ({ rate: s.rate, records: s.records }))} />
            </section>
          </>
        ) : null}

        <section className="chart-card">
          <h2>Account balances over time</h2>
          <div className="chart-subtitle">
            Month-end ZNN and QSR balances. ZNN climbs to 15,000 (lock reserve), then surplus is
            sold each month for QSR until a launch fires.
          </div>
          <ChartBalances records={records} />
        </section>

        <section className="chart-card">
          <h2>Share of network inflation captured</h2>
          <div className="chart-subtitle">
            Operator's cumulative ZNN earned and QSR acquired, each divided by the network's
            cumulative inflation of that asset over the same period.
          </div>
          <ChartInflationShare params={params} records={records} />
        </section>

        <section className="chart-card">
          <h2>Cumulative ZNN &amp; QSR flows</h2>
          <div className="chart-subtitle">
            ZNN channels on the left axis (earned from producing, earned from delegation, sold
            for QSR). QSR channels on the right axis (acquired from selling ZNN, burned on
            pillar launches).
          </div>
          <ChartFlows records={records} />
        </section>

        <section className="chart-card">
          <h2>Next pillar cost</h2>
          <div className="chart-subtitle">
            Escalating QSR cost — starts at 330,000 and rises 10,000 per launch.
          </div>
          <ChartNextCost records={records} />
        </section>

        <section className="chart-card">
          <h2>Audit: every number, step by step</h2>
          <div className="chart-subtitle">
            Each value the engine uses, derived from the current parameters. If a chart looks
            wrong, cross-check the formula here — every row shows the inputs, the formula, and
            the output.
          </div>
          <MathBreakdown params={params} records={records} />
        </section>

        <div className="footer">
          Data & source:&nbsp;
          <a href="https://github.com/0x3639/pillar-inflation" target="_blank" rel="noreferrer">
            github.com/0x3639/pillar-inflation
          </a>
          . Share current scenario by copying the URL.
        </div>
      </main>
    </div>
  );
}
