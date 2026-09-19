import React from 'react';

export interface OptimizationParams {
  k: number;
  maxRadiusKm: number;
  fuelCostPerKm: number;
  demandGrowthPercent: number;
  warehouseCapacity: number;
}

interface ControlPanelProps {
  params: OptimizationParams;
  onChangeParams: (updated: OptimizationParams) => void;
  onOptimize: () => void;
  isOptimizing?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onChangeParams,
  onOptimize,
  isOptimizing = false,
}) => {
  const updateField = <K extends keyof OptimizationParams>(
    key: K,
    value: OptimizationParams[K]
  ) => {
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-md space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h2 className="text-lg font-semibold tracking-wide text-indigo-400">
          Optimization Controls
        </h2>
        <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded font-mono">
          k = {params.k}
        </span>
      </div>

      <div className="space-y-4 text-xs font-medium text-slate-300">
        {/* Number of Warehouses (k) */}
        <div>
          <div className="flex justify-between mb-1">
            <label>Warehouses (k)</label>
            <span className="text-indigo-400 font-mono text-sm">{params.k}</span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={params.k}
            onChange={(e) => updateField('k', parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Warehouse Capacity Limit */}
        <div>
          <div className="flex justify-between mb-1">
            <label>Max Warehouse Capacity (orders)</label>
            <span className="text-indigo-400 font-mono text-sm">
              {params.warehouseCapacity}
            </span>
          </div>
          <input
            type="number"
            min="100"
            step="50"
            value={params.warehouseCapacity}
            onChange={(e) =>
              updateField('warehouseCapacity', Math.max(1, parseInt(e.target.value, 10) || 0))
            }
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Max Service Radius */}
        <div>
          <div className="flex justify-between mb-1">
            <label>Max Delivery Radius</label>
            <span className="text-indigo-400 font-mono text-sm">
              {params.maxRadiusKm} km
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={params.maxRadiusKm}
            onChange={(e) => updateField('maxRadiusKm', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Fuel Cost multiplier */}
        <div>
          <div className="flex justify-between mb-1">
            <label>Fuel Cost Per Km ($)</label>
            <span className="text-indigo-400 font-mono text-sm">
              ${params.fuelCostPerKm.toFixed(2)}
            </span>
          </div>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={params.fuelCostPerKm}
            onChange={(e) =>
              updateField('fuelCostPerKm', parseFloat(e.target.value) || 0)
            }
            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Demand Growth */}
        <div>
          <div className="flex justify-between mb-1">
            <label>Demand Growth Simulation</label>
            <span className="text-indigo-400 font-mono text-sm">
              +{params.demandGrowthPercent}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={params.demandGrowthPercent}
            onChange={(e) =>
              updateField('demandGrowthPercent', parseInt(e.target.value, 10))
            }
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        disabled={isOptimizing}
        onClick={onOptimize}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition shadow-lg shadow-indigo-950/50 cursor-pointer"
      >
        {isOptimizing ? 'Computing Optimum...' : 'Run Optimization'}
      </button>
    </div>
  );
};