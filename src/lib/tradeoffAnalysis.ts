import { optimizeWarehouses } from './optimization.ts';
import type { Neighborhood } from '../types.ts';

export type CostVsKPoint = {
  k: number;
  totalCost: number;
  unservedCount: number;
};

export type DemandGrowthPoint = {
  growthPercent: number;
  totalCost: number;
  unservedCount: number;
};

/**
 * Sweep k from 1..maxK at current demand (growth = 0).
 * optimizeWarehouses already keeps the best of several random restarts.
 */
export function generateCostVsKData(
  neighborhoods: Neighborhood[],
  maxK: number,
  maxRadiusKm: number,
  fuelCostPerKm: number,
): CostVsKPoint[] {
  const lastK = Math.max(0, Math.floor(maxK));
  const points: CostVsKPoint[] = [];

  for (let k = 1; k <= lastK; k++) {
    const result = optimizeWarehouses(neighborhoods, {
      k,
      maxRadiusKm,
      fuelCostPerKm,
      demandGrowthPercent: 0,
    });
    points.push({
      k,
      totalCost: result.totalCost,
      unservedCount: result.unservedNeighborhoodIds.length,
    });
  }

  return points;
}

/**
 * Sweep demand-growth percentages at a fixed k.
 * growthSteps are percents, e.g. [0, 20, 50, 100] → 1.0×, 1.2×, 1.5×, 2.0× orders.
 */
export function generateDemandGrowthData(
  neighborhoods: Neighborhood[],
  k: number,
  maxRadiusKm: number,
  fuelCostPerKm: number,
  growthSteps: number[],
): DemandGrowthPoint[] {
  return growthSteps.map((growthPercent) => {
    const result = optimizeWarehouses(neighborhoods, {
      k,
      maxRadiusKm,
      fuelCostPerKm,
      demandGrowthPercent: growthPercent,
    });
    return {
      growthPercent,
      totalCost: result.totalCost,
      unservedCount: result.unservedNeighborhoodIds.length,
    };
  });
}
