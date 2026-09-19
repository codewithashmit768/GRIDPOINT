import { optimizeWarehouses } from './optimization.ts';
import type {
  Neighborhood,
  OptimizationParams,
  OptimizationResult,
} from '../types.ts';

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

/** k-means++ is random — a few restarts keep the chart from one unlucky seed. */
const RESTARTS = 8;

function bestOptimize(
  neighborhoods: Neighborhood[],
  params: OptimizationParams,
): OptimizationResult {
  let best = optimizeWarehouses(neighborhoods, params);
  for (let i = 1; i < RESTARTS; i++) {
    const next = optimizeWarehouses(neighborhoods, params);
    if (next.totalCost < best.totalCost) {
      best = next;
    }
  }
  return best;
}

/**
 * Sweep k from 1..maxK at current demand (growth = 0).
 * CostChart can plot this directly. Each k keeps the best of a few random restarts.
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
    const result = bestOptimize(neighborhoods, {
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
    const result = bestOptimize(neighborhoods, {
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
