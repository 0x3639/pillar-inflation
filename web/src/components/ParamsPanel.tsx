import { BooleanField, Group, NumberField, SelectField } from "./ParamField";
import { useParamsStore } from "../state/useParamsStore";
import type { StrategyName } from "../sim/params";

export function ParamsPanel() {
  const params = useParamsStore((s) => s.params);
  const setParam = useParamsStore((s) => s.setParam);
  const reset = useParamsStore((s) => s.reset);
  const sweepMode = useParamsStore((s) => s.sweepMode);
  const setSweepMode = useParamsStore((s) => s.setSweepMode);

  return (
    <div>
      <h1>Pillar Inflation Sim</h1>
      <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginTop: "-0.2rem" }}>
        Zenon Network pillar accumulation over time.
      </p>

      <Group title="Operator start">
        <div className="grid-2">
          <NumberField
            label="Top-30 pillars"
            value={params.start_top30}
            onChange={(v) => setParam("start_top30", v)}
            min={0}
            max={30}
            step={1}
          />
          <NumberField
            label="Bottom pillars"
            value={params.start_bottom}
            onChange={(v) => setParam("start_bottom", v)}
            min={0}
            step={1}
          />
        </div>
        <NumberField
          label="Next pillar cost (QSR)"
          value={params.start_next_qsr_cost}
          onChange={(v) => setParam("start_next_qsr_cost", v)}
          min={0}
          step={10000}
        />
        <div className="grid-2">
          <NumberField
            label="Starting ZNN"
            value={params.start_znn}
            onChange={(v) => setParam("start_znn", v)}
            min={0}
            step={1000}
          />
          <NumberField
            label="Starting QSR"
            value={params.start_qsr}
            onChange={(v) => setParam("start_qsr", v)}
            min={0}
            step={1000}
          />
        </div>
      </Group>

      <Group title="Market">
        <NumberField
          label={`Swap rate (1 ZNN → ${params.swap_rate} QSR)`}
          value={params.swap_rate}
          onChange={(v) => setParam("swap_rate", v)}
          min={1}
          max={15}
          step={0.5}
          slider
          hint={`1 ZNN = ${params.swap_rate} QSR`}
        />
        <BooleanField
          label="Sweep all rates 1:3 – 1:10"
          value={sweepMode}
          onChange={setSweepMode}
          hint="compare"
        />
      </Group>

      <Group title="Strategy">
        <SelectField<StrategyName>
          label="Operator policy"
          value={params.strategy_name}
          onChange={(v) => setParam("strategy_name", v)}
          options={[
            { value: "lock_threshold", label: "Accumulate-then-sell (monthly)" },
            { value: "sell_all_yearly", label: "Sell-all yearly (spec baseline)" },
          ]}
        />
        <BooleanField
          label="Attempt top-30 promotions"
          value={params.promote_to_top30}
          onChange={(v) => setParam("promote_to_top30", v)}
        />
        {params.promote_to_top30 ? (
          <div className="grid-2">
            <NumberField
              label="Max promotions/year"
              value={params.max_promotions_per_year}
              onChange={(v) => setParam("max_promotions_per_year", v)}
              min={1}
              max={30}
              step={1}
            />
            <NumberField
              label="Operator top-30 cap"
              value={params.operator_max_top30}
              onChange={(v) => setParam("operator_max_top30", v)}
              min={params.start_top30}
              max={30}
              step={1}
            />
          </div>
        ) : null}
      </Group>

      <Group title="Network constants" defaultOpen={false}>
        <div className="grid-2">
          <NumberField
            label="ZNN daily emissions"
            value={params.znn_daily_emissions}
            onChange={(v) => setParam("znn_daily_emissions", v)}
            min={0}
            step={10}
          />
          <NumberField
            label="Pool fraction"
            value={params.pillar_pool_fraction}
            onChange={(v) => setParam("pillar_pool_fraction", v)}
            min={0}
            max={1}
            step={0.05}
          />
        </div>
        <div className="grid-2">
          <NumberField
            label="Top-30 pool share"
            value={params.top30_fraction}
            onChange={(v) => setParam("top30_fraction", v)}
            min={0}
            max={1}
            step={0.05}
          />
          <NumberField
            label="ZNN lock/pillar"
            value={params.znn_lock_per_pillar}
            onChange={(v) => setParam("znn_lock_per_pillar", v)}
            min={0}
            step={1000}
          />
        </div>
        <div className="grid-2">
          <NumberField
            label="Top-30 delegation"
            value={params.top30_delegation_threshold}
            onChange={(v) => setParam("top30_delegation_threshold", v)}
            min={0}
            step={1000}
          />
          <NumberField
            label="QSR cost step"
            value={params.qsr_cost_step}
            onChange={(v) => setParam("qsr_cost_step", v)}
            min={0}
            step={1000}
          />
        </div>
        <NumberField
          label="Network pillars (start)"
          value={params.starting_total_pillars}
          onChange={(v) => setParam("starting_total_pillars", v)}
          min={params.top30_slots}
          step={1}
        />
      </Group>

      <Group title="Delegation reward (24% pool)">
        <BooleanField
          label="Include delegation reward"
          value={params.include_delegation_reward}
          onChange={(v) => setParam("include_delegation_reward", v)}
          hint="protocol delegation pool"
        />
        {params.include_delegation_reward ? (
          <>
            <div className="grid-2">
              <NumberField
                label="Total ZNN del / top-30 pillar"
                value={params.pillar_total_delegation_top30}
                onChange={(v) => setParam("pillar_total_delegation_top30", v)}
                min={0}
                step={10000}
              />
              <NumberField
                label="Self ZNN del / top-30 pillar"
                value={params.pillar_self_delegation_top30}
                onChange={(v) => setParam("pillar_self_delegation_top30", v)}
                min={0}
                max={params.pillar_total_delegation_top30}
                step={10000}
              />
            </div>
            <div className="grid-2">
              <NumberField
                label="Total ZNN del / bottom"
                value={params.pillar_total_delegation_bottom}
                onChange={(v) => setParam("pillar_total_delegation_bottom", v)}
                min={0}
                step={1000}
              />
              <NumberField
                label="Self ZNN del / bottom"
                value={params.pillar_self_delegation_bottom}
                onChange={(v) => setParam("pillar_self_delegation_bottom", v)}
                min={0}
                max={params.pillar_total_delegation_bottom}
                step={1000}
              />
            </div>
            <div className="grid-2">
              <NumberField
                label="Net avg del / top-30"
                value={params.network_avg_top30_delegation}
                onChange={(v) => setParam("network_avg_top30_delegation", v)}
                min={0}
                step={10000}
                hint="network-wide average"
              />
              <NumberField
                label="Net avg del / bottom"
                value={params.network_avg_bottom_delegation}
                onChange={(v) => setParam("network_avg_bottom_delegation", v)}
                min={0}
                step={1000}
                hint="0 = stake isn't delegation"
              />
            </div>
          </>
        ) : null}
      </Group>

      <Group title="Reward share with delegators">
        <NumberField
          label="% momentum given to delegators"
          value={params.give_momentum_reward_pct}
          onChange={(v) => setParam("give_momentum_reward_pct", v)}
          min={0}
          max={100}
          step={5}
          slider
          hint={`${params.give_momentum_reward_pct}% (dashboard left number)`}
        />
        <NumberField
          label="% delegation given to delegators"
          value={params.give_delegation_reward_pct}
          onChange={(v) => setParam("give_delegation_reward_pct", v)}
          min={0}
          max={100}
          step={5}
          slider
          hint={`${params.give_delegation_reward_pct}% (dashboard right number)`}
        />
      </Group>

      <Group title="Network growth">
        <NumberField
          label="New bottom pillars/year (other operators)"
          value={params.network_growth_per_year}
          onChange={(v) => setParam("network_growth_per_year", v)}
          min={0}
          max={50}
          step={1}
          slider
          hint={`${params.network_growth_per_year} / year — dilutes bottom pool`}
        />
        <BooleanField
          label="Dilute bottom pool by live pillar count"
          value={params.dilute_bottom_rewards}
          onChange={(v) => setParam("dilute_bottom_rewards", v)}
          hint="off = spec.md fixed-67 denominator"
        />
      </Group>

      <Group title="Run">
        <NumberField
          label="Horizon (months)"
          value={params.months}
          onChange={(v) => setParam("months", v)}
          min={12}
          max={360}
          step={12}
          slider
          hint={`${params.months} months ≈ ${(params.months / 12).toFixed(1)} years`}
        />
      </Group>

      <div className="toolbar">
        <button onClick={reset}>Reset to defaults</button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
          }}
        >
          Copy share link
        </button>
      </div>
    </div>
  );
}
