import { useEffect, useState } from 'react';
import { ControlPanel } from './components/ControlPanel.tsx';
import type { OptimizationParams as ControlPanelParams } from './components/ControlPanel.tsx';
import { DataInput } from './components/DataInput.tsx';
import { MapView } from './components/MapView.tsx';
import { optimizeWarehouses } from './lib/optimization.ts';
import type { OptimizationResult } from './lib/optimization.ts';
import type {
  Neighborhood,
  OptimizationParams as EngineParams,
} from './types.ts';
import { sampleNeighborhoods } from './data/sampleNeighborhoods.ts';

const DEFAULT_CONTROL_PARAMS: ControlPanelParams = {
  k: 3,
  maxRadiusKm: 25,
  fuelCostPerKm: 1,
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

  const maxK = Math.max(1, neighborhoods.length - 1);

  useEffect(() => {
    setControlParams((current) =>
      current.k > maxK ? { ...current, k: maxK } : current,
    );
  }, [maxK]);

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
      setResult(optimizeWarehouses(neighborhoods, engineParams));
      setIsOptimizing(false);
    }, 50);
  }

  function handleAddNeighborhood(item: Neighborhood) {
    setNeighborhoods((current) => [...current, item]);
  }

  function handleSetNeighborhoods(items: Neighborhood[]) {
    setNeighborhoods(items);
  }

  function handleResetDefault() {
    setNeighborhoods([...sampleNeighborhoods]);
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
              <div className="flex justify-between text-slate-300">
                <span>Total cost</span>
                <span className="font-mono text-slate-100">
                  ${result.totalCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Baseline cost</span>
                <span className="font-mono text-slate-100">
                  ${result.baselineCost.toFixed(2)}
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

        <section className="min-h-0 min-w-0 flex-1">
          <div className="h-full min-h-[500px] overflow-hidden rounded-xl border border-slate-800">
            <MapView
              neighborhoods={neighborhoods}
              result={result}
              maxRadiusKm={controlParams.maxRadiusKm}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
