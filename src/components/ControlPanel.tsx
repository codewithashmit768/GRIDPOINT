import React, { useState } from 'react';

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
  maxK: number;
}

type VehicleType = 'ev' | 'diesel' | 'freight' | 'custom';

interface FleetOption {
  id: VehicleType;
  label: string;
  icon: string;
  fuelCost: number;
  maxRadius: number;
  desc: string;
}

const FLEET_PROFILES: FleetOption[] = [
  {
    id: 'ev',
    label: 'EV Van',
    icon: '⚡',
    fuelCost: 0.4,
    maxRadius: 15,
    desc: 'Eco • ₹0.40/km • 15km cap',
  },
  {
    id: 'diesel',
    label: 'Diesel Van',
    icon: '🚐',
    fuelCost: 1.2,
    maxRadius: 35,
    desc: 'Standard • ₹1.20/km • 35km cap',
  },
  {
    id: 'freight',
    label: 'Freight Truck',
    icon: '🚛',
    fuelCost: 2.5,
    maxRadius: 60,
    desc: 'Heavy • ₹2.50/km • 60km cap',
  },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onChangeParams,
  onOptimize,
  isOptimizing = false,
  maxK,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('diesel');

  const updateField = <K extends keyof OptimizationParams>(
    key: K,
    value: OptimizationParams[K]
  ) => {
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  const handleSelectFleet = (fleet: FleetOption) => {
    setSelectedVehicle(fleet.id);
    onChangeParams({
      ...params,
      fuelCostPerKm: fleet.fuelCost,
      maxRadiusKm: fleet.maxRadius,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-xl space-y-5 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            Optimization Controls
          </h2>
          <p className="text-[11px] text-slate-400">Algorithmic parameter tuning</p>
        </div>
        <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono font-medium">
          k = {params.k}
        </span>
      </div>

      {/* Fleet / Vehicle Selection (Bonus Feature) */}
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center justify-between">
          <span>Fleet Vehicle Profile</span>
          <span className="text-[10px] text-indigo-400 font-normal uppercase tracking-wider">
            Bonus Spec
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FLEET_PROFILES.map((fleet) => {
            const isSelected = selectedVehicle === fleet.id;
            return (
              <button
                key={fleet.id}
                type="button"
                onClick={() => handleSelectFleet(fleet)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/60 shadow-md shadow-indigo-950 text-white ring-1 ring-indigo-500/50'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="text-lg mb-1">{fleet.icon}</div>
                <div className="text-xs font-semibold">{fleet.label}</div>
                <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                  {fleet.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Numerical Controls */}
      <div className="space-y-4 text-xs font-medium text-slate-300">
        {/* Warehouses (k) */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-slate-300">Warehouses (k)</label>
            <span className="text-indigo-400 font-mono text-xs">{params.k} centers</span>
          </div>
          <input
            type="range"
            min="1"
            max={maxK}
            step="1"
            value={params.k}
            onChange={(e) => updateField('k', parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {/* Max Warehouse Capacity */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-slate-300">Capacity Cap per Hub (orders)</label>
            <span className="text-indigo-400 font-mono text-xs">
              {params.warehouseCapacity} max
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
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
          />
        </div>

        {/* Max Service Radius */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-slate-300">Max Service Radius</label>
            <span className="text-indigo-400 font-mono text-xs">
              {params.maxRadiusKm} km
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="70"
            step="1"
            value={params.maxRadiusKm}
            onChange={(e) => {
              setSelectedVehicle('custom');
              updateField('maxRadiusKm', parseFloat(e.target.value));
            }}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {/* Fuel Cost multiplier */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-slate-300">Fuel Cost Per Km (₹)</label>
            <span className="text-indigo-400 font-mono text-xs">
              ₹{params.fuelCostPerKm.toFixed(2)}/km
            </span>
          </div>
          <input
            type="number"
            step="0.05"
            min="0.05"
            value={params.fuelCostPerKm}
            onChange={(e) => {
              setSelectedVehicle('custom');
              updateField('fuelCostPerKm', parseFloat(e.target.value) || 0);
            }}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
          />
        </div>

        {/* Demand Growth Simulation */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-slate-300">Simulated Demand Growth</label>
            <span className="text-emerald-400 font-mono text-xs">
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
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>
      </div>

      {/* Run Optimization Button */}
      <button
        type="button"
        disabled={isOptimizing}
        onClick={onOptimize}
        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-semibold text-xs tracking-wider uppercase transition shadow-lg shadow-indigo-600/30 cursor-pointer"
      >
        {isOptimizing ? 'Recomputing Centroids...' : 'Run Optimization'}
      </button>
    </div>
  );
};