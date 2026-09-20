import { useEffect, useState } from 'react';
import { ControlPanel } from './components/ControlPanel.tsx';
import type { OptimizationParams as ControlPanelParams } from './components/ControlPanel.tsx';
import { DataInput } from './components/DataInput.tsx';
import { MapView } from './components/MapView.tsx';
import { CostChart } from './components/CostChart.tsx';
import type { CostHistoryPoint } from './components/CostChart.tsx';
import {
  BeforeAfterToggle,
  type ViewMode,
} from './components/BeforeAfterToggle.tsx';
import {
  getBaselineCost,
  optimizeWarehouses,
} from './lib/optimization.ts';
import type { OptimizationResult } from './lib/optimization.ts';
import type {
  Neighborhood,
  OptimizationParams as EngineParams,
} from './types.ts';
import { sampleNeighborhoods } from './data/sampleNeighborhoods.ts';

const DEFAULT_CONTROL_PARAMS: ControlPanelParams = {
  k: 3,
  maxRadiusKm: 35,
  fuelCostPerKm: 1.2,
  demandGrowthPercent: 0,
  warehouseCapacity: 400,
};

export default function App() {
  const [neighborhoods, setNeighborhoods] =
    useState<Neighborhood[]>(sampleNeighborhoods);
  const [controlParams, setControlParams] = useState<ControlPanelParams>(
    DEFAULT_CONTROL_PARAMS,
  );
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [costHistory, setCostHistory] = useState<CostHistoryPoint[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('optimized');
  const [isStale, setIsStale] = useState(false);
  const [originalCost, setOriginalCost] = useState(() =>
    getBaselineCost(
      sampleNeighborhoods,
      DEFAULT_CONTROL_PARAMS.demandGrowthPercent,
      DEFAULT_CONTROL_PARAMS.fuelCostPerKm,
    ),
  );

  const maxK = Math.max(1, neighborhoods.length - 1);

  useEffect(() => {
    setControlParams((current) =>
      current.k > maxK ? { ...current, k: maxK } : current,
    );
  }, [maxK]);

  useEffect(() => {
    if (result) {
      setOriginalCost(result.baselineCost);
      return;
    }
    setOriginalCost(
      getBaselineCost(
        neighborhoods,
        controlParams.demandGrowthPercent,
        controlParams.fuelCostPerKm,
      ),
    );
  }, [
    result,
    neighborhoods,
    controlParams.demandGrowthPercent,
    controlParams.fuelCostPerKm,
  ]);

  function handleOptimize() {
    setIsOptimizing(true);
    window.setTimeout(() => {
      const engineParams: EngineParams = {
        k: Math.min(controlParams.k, maxK),
        maxRadiusKm: controlParams.maxRadiusKm,
        fuelCostPerKm: controlParams.fuelCostPerKm,
        demandGrowthPercent: controlParams.demandGrowthPercent,
        capacityPerWarehouse: controlParams.warehouseCapacity,
      };

      const history: CostHistoryPoint[] = [];
      let selected: OptimizationResult | null = null;
      for (let k = 1; k <= engineParams.k; k++) {
        const next = optimizeWarehouses(neighborhoods, { ...engineParams, k });
        history.push({ k, totalCost: next.totalCost });
        if (k === engineParams.k) selected = next;
      }

      setCostHistory(history);
      setResult(selected);
      setOriginalCost(
        selected
          ? selected.baselineCost
          : getBaselineCost(
              neighborhoods,
              engineParams.demandGrowthPercent,
              engineParams.fuelCostPerKm,
            ),
      );
      setIsStale(false);
      setIsOptimizing(false);
    }, 50);
  }

  function handleAddNeighborhood(item: Neighborhood) {
    setNeighborhoods((current) => [...current, item]);
    if (result) setIsStale(true);
  }

  function handleSetNeighborhoods(items: Neighborhood[]) {
    setNeighborhoods(items);
    if (result) setIsStale(true);
  }

  function handleResetDefault() {
    setNeighborhoods([...sampleNeighborhoods]);
    if (result) setIsStale(true);
  }

  const savingsPercent =
    result && result.baselineCost !== 0
      ? ((result.baselineCost - result.totalCost) / result.baselineCost) * 100
      : 0;

  return (
    <div className="h-screen bg-slate-950 text-slate-100">
      <div className="flex h-full min-h-0 gap-4 p-4">
        <aside className="flex w-1/3 min-w-80 max-w-md shrink-0 flex-col gap-4 overflow-y-auto">
          <ControlPanel
            params={controlParams}
            onChangeParams={setControlParams}
            onOptimize={handleOptimize}
            isOptimizing={isOptimizing}
            maxK={maxK}
          />

          {result && (
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm shadow-md">
              <h3 className="text-xs font-semibold tracking-wide text-indigo-400 uppercase">
                Cost summary
              </h3>
              {isStale && (
                <div className="rounded-md border border-amber-700/60 bg-amber-950/50 px-3 py-2 text-xs text-amber-200">
                  Dataset changed — click Run Optimization to refresh these
                  numbers
                </div>
              )}
              <div className="flex justify-between text-slate-300">
                <span>Total cost</span>
                <span className="font-mono text-slate-100">
                  ₹{result.totalCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Baseline cost</span>
                <span className="font-mono text-slate-100">
                  ₹{result.baselineCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-slate-300">
                <span>Savings</span>
                <span className="font-mono text-indigo-400">
                  {savingsPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          <DataInput
            neighborhoods={neighborhoods}
            onAddNeighborhood={handleAddNeighborhood}
            onSetNeighborhoods={handleSetNeighborhoods}
            onResetDefault={handleResetDefault}
          />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div className="relative flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-800">
            <div className="flex justify-end bg-slate-900/80 px-3 py-2 md:hidden">
              <BeforeAfterToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>
            <div className="relative min-h-0 flex-1">
              <MapView
                neighborhoods={neighborhoods}
                result={result}
                maxRadiusKm={controlParams.maxRadiusKm}
                viewMode={viewMode}
                setViewMode={setViewMode}
                originalCost={originalCost}
                currentOptimizedCost={result ? result.totalCost : null}
                isStale={isStale}
              />
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold tracking-wide text-indigo-400 uppercase">
                Cost vs warehouses
              </h3>
              <button
                type="button"
                onClick={() => setCostHistory([])}
                className="rounded border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              >
                Reset Cost Chart
              </button>
            </div>
            {isStale && (
              <p className="mb-2 text-[11px] text-amber-300">
                Dataset changed — chart reflects the previous dataset
              </p>
            )}
            <div className={isStale ? 'opacity-50' : undefined}>
              <CostChart
                neighborhoods={neighborhoods}
                numberOfWarehouses={controlParams.k}
                costHistory={costHistory}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
