import { create } from "zustand";
import { DEFAULT_PARAMS, type SimParams, type StrategyName } from "../sim/params";

type UIState = {
  sweepMode: boolean;
  setSweepMode: (v: boolean) => void;
};

type ParamsState = {
  params: SimParams;
  setParam: <K extends keyof SimParams>(key: K, value: SimParams[K]) => void;
  setParams: (p: Partial<SimParams>) => void;
  reset: () => void;
};

export const useParamsStore = create<ParamsState & UIState>((set) => ({
  params: { ...DEFAULT_PARAMS, ...paramsFromUrl() },
  sweepMode: false,
  setSweepMode: (v) => set({ sweepMode: v }),
  setParam: (key, value) =>
    set((state) => {
      const next = { ...state.params, [key]: value };
      writeParamsToUrl(next);
      return { params: next };
    }),
  setParams: (p) =>
    set((state) => {
      const next = { ...state.params, ...p };
      writeParamsToUrl(next);
      return { params: next };
    }),
  reset: () => {
    writeParamsToUrl(DEFAULT_PARAMS);
    set({ params: { ...DEFAULT_PARAMS } });
  },
}));

// URL persistence — lets users share scenarios via link.
function paramsFromUrl(): Partial<SimParams> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("p");
  if (!raw) return {};
  try {
    const decoded = JSON.parse(atob(raw));
    return sanitize(decoded);
  } catch {
    return {};
  }
}

function sanitize(input: Record<string, unknown>): Partial<SimParams> {
  const known = Object.keys(DEFAULT_PARAMS) as (keyof SimParams)[];
  const out: Partial<SimParams> = {};
  for (const k of known) {
    if (k in input) {
      const v = input[k];
      const dflt = DEFAULT_PARAMS[k];
      if (typeof v === typeof dflt) {
        // typed cast through unknown
        (out as Record<string, unknown>)[k] = v;
      }
    }
  }
  return out;
}

function writeParamsToUrl(p: SimParams): void {
  if (typeof window === "undefined") return;
  const diff: Record<string, unknown> = {};
  for (const k of Object.keys(DEFAULT_PARAMS) as (keyof SimParams)[]) {
    if (p[k] !== DEFAULT_PARAMS[k]) diff[k] = p[k];
  }
  const url = new URL(window.location.href);
  if (Object.keys(diff).length === 0) {
    url.searchParams.delete("p");
  } else {
    url.searchParams.set("p", btoa(JSON.stringify(diff)));
  }
  window.history.replaceState({}, "", url.toString());
}

// Re-export for convenience
export type { SimParams, StrategyName };
