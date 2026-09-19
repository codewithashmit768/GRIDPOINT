import { useState } from 'react';
import { sampleNeighborhoods } from './data/sampleNeighborhoods.ts';
import { optimizeWarehouses } from './lib/optimization.ts';
import type {
  Neighborhood,
  OptimizationParams,
  OptimizationResult,
  Warehouse,
} from './types.ts';

function warehouseLoad(
  warehouse: Warehouse,
  neighborhoods: Neighborhood[],
  demandGrowthPercent: number,
): number {
  const multiplier = 1 + demandGrowthPercent / 100;
  const byId = new Map(neighborhoods.map((n) => [n.id, n]));
  return warehouse.assignedNeighborhoodIds.reduce((sum, id) => {
    const n = byId.get(id);
    return sum + (n ? n.orders * multiplier : 0);
  }, 0);
}

function neighborhoodName(id: string): string {
  return sampleNeighborhoods.find((n) => n.id === id)?.name ?? id;
}

function formatResult(
  result: OptimizationResult,
  demandGrowthPercent: number,
): string {
  const lines: string[] = [];

  for (const w of result.warehouses) {
    const names = w.assignedNeighborhoodIds.map(neighborhoodName);
    const load = warehouseLoad(w, sampleNeighborhoods, demandGrowthPercent);
    lines.push(`${w.id}`);
    lines.push(`  location:  ${w.lat.toFixed(4)}, ${w.lng.toFixed(4)}`);
    lines.push(`  load:      ${load.toFixed(0)} / ${w.capacity.toFixed(0)} orders`);
    lines.push(`  assigned:  ${names.length ? names.join(', ') : '(none)'}`);
    lines.push('');
  }

  const savings =
    result.baselineCost === 0
      ? 0
      : ((result.baselineCost - result.totalCost) / result.baselineCost) * 100;

  lines.push(`totalCost:     ${result.totalCost.toFixed(2)}`);
  lines.push(`baselineCost:  ${result.baselineCost.toFixed(2)}`);
  lines.push(`savings:       ${savings.toFixed(1)}% vs 1-warehouse baseline`);

  if (result.unservedNeighborhoodIds.length > 0) {
    lines.push('');
    lines.push('unserved (beyond max radius):');
    for (const id of result.unservedNeighborhoodIds) {
      lines.push(`  - ${neighborhoodName(id)}`);
    }
  } else {
    lines.push('');
    lines.push('unserved: none');
  }

  return lines.join('\n');
}

export default function App() {
  const [k, setK] = useState(3);
  const [maxRadiusKm, setMaxRadiusKm] = useState(25);
  const [fuelCostPerKm, setFuelCostPerKm] = useState(1);
  const [demandGrowthPercent, setDemandGrowthPercent] = useState(0);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  function handleOptimize() {
    const params: OptimizationParams = {
      k,
      maxRadiusKm,
      fuelCostPerKm,
      demandGrowthPercent,
    };
    setResult(optimizeWarehouses(sampleNeighborhoods, params));
  }

  return (
    <main className="mx-auto max-w-2xl p-6 text-slate-900">
      <h1 className="text-xl font-semibold">GRIDPOINT — optimizer test</h1>
      <p className="mt-1 text-sm text-slate-600">
        Temporary scaffold. Uses {sampleNeighborhoods.length} Bengaluru sample
        neighborhoods.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          k (warehouses)
          <input
            type="number"
            min={1}
            max={sampleNeighborhoods.length}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          maxRadiusKm
          <input
            type="number"
            min={0}
            value={maxRadiusKm}
            onChange={(e) => setMaxRadiusKm(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          fuelCostPerKm
          <input
            type="number"
            min={0}
            step="0.1"
            value={fuelCostPerKm}
            onChange={(e) => setFuelCostPerKm(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          demandGrowthPercent
          <input
            type="number"
            value={demandGrowthPercent}
            onChange={(e) => setDemandGrowthPercent(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleOptimize}
        className="mt-4 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Optimize
      </button>

      {result ? (
        <pre className="mt-6 overflow-auto rounded bg-slate-100 p-4 text-sm leading-6 whitespace-pre-wrap">
          {formatResult(result, demandGrowthPercent)}
        </pre>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Click Optimize to run the algorithm.
        </p>
      )}
    </main>
  );
}
