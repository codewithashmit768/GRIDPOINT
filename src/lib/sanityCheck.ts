import { haversineDistance } from './haversine.ts';
import { getBaselineWarehouse, optimizeWarehouses } from './optimization.ts';
import type { Neighborhood, OptimizationParams } from '../types.ts';

/**
 * Sample neighborhoods around Bengaluru so clusters are geographically real.
 * Run from the project root:
 *   npx tsx src/lib/sanityCheck.ts
 */
const SAMPLE_NEIGHBORHOODS: Neighborhood[] = [
  { id: 'n1', name: 'Koramangala', lat: 12.9352, lng: 77.6245, orders: 120 },
  { id: 'n2', name: 'Whitefield', lat: 12.9698, lng: 77.7499, orders: 200 },
  { id: 'n3', name: 'Indiranagar', lat: 12.9784, lng: 77.6408, orders: 150 },
  { id: 'n4', name: 'Jayanagar', lat: 12.925, lng: 77.5838, orders: 90 },
  { id: 'n5', name: 'Malleswaram', lat: 13.0035, lng: 77.5648, orders: 80 },
  { id: 'n6', name: 'Electronic City', lat: 12.8452, lng: 77.6602, orders: 180 },
  { id: 'n7', name: 'Hebbal', lat: 13.0358, lng: 77.597, orders: 70 },
  { id: 'n8', name: 'BTM Layout', lat: 12.9166, lng: 77.6101, orders: 110 },
  { id: 'n9', name: 'Yelahanka', lat: 13.1005, lng: 77.5963, orders: 60 },
  { id: 'n10', name: 'HSR Layout', lat: 12.9121, lng: 77.6446, orders: 140 },
];

function loadOf(
  assignedIds: string[],
  neighborhoods: Neighborhood[],
  demandMultiplier: number,
): number {
  const byId = new Map(neighborhoods.map((n) => [n.id, n]));
  return assignedIds.reduce((sum, id) => {
    const n = byId.get(id);
    return sum + (n ? n.orders * demandMultiplier : 0);
  }, 0);
}

function check(label: string, passed: boolean, detail?: string): void {
  const mark = passed ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
}

export function runSanityCheck(): void {
  console.log('--- GRIDPOINT optimization sanity check ---\n');

  const equatorKm = haversineDistance(0, 0, 0, 1);
  check(
    'haversine 1° longitude at equator ≈ 111.19 km',
    Math.abs(equatorKm - 111.19) < 0.05,
    `${equatorKm.toFixed(3)} km`,
  );

  const params: OptimizationParams = {
    k: 3,
    maxRadiusKm: 25,
    fuelCostPerKm: 12,
    demandGrowthPercent: 0,
  };

  console.time('optimizeWarehouses');
  const result = optimizeWarehouses(SAMPLE_NEIGHBORHOODS, params);
  console.timeEnd('optimizeWarehouses');
  const demandMultiplier = 1 + params.demandGrowthPercent / 100;
  const allIds = SAMPLE_NEIGHBORHOODS.map((n) => n.id);
  const assigned = result.warehouses.flatMap((w) => w.assignedNeighborhoodIds);
  const assignedSet = new Set(assigned);
  const unservedSet = new Set(result.unservedNeighborhoodIds);
  const covered = new Set([...assigned, ...result.unservedNeighborhoodIds]);

  console.log('\nDefault run (k=3, radius=25km, growth=0%):');
  console.log(`  warehouses: ${result.warehouses.length}`);
  for (const w of result.warehouses) {
    const names = w.assignedNeighborhoodIds
      .map((id) => SAMPLE_NEIGHBORHOODS.find((n) => n.id === id)?.name)
      .join(', ');
    const load = loadOf(w.assignedNeighborhoodIds, SAMPLE_NEIGHBORHOODS, demandMultiplier);
    console.log(
      `  ${w.id}  (${w.lat.toFixed(4)}, ${w.lng.toFixed(4)})  load ${load.toFixed(0)}/${w.capacity.toFixed(0)}  →  ${names || '(empty)'}`,
    );
  }
  console.log(`  unserved: ${result.unservedNeighborhoodIds.join(', ') || '(none)'}`);
  console.log(`  totalCost:    ${result.totalCost.toFixed(2)}`);
  console.log(`  baselineCost: ${result.baselineCost.toFixed(2)}`);
  const savings = result.baselineCost - result.totalCost;
  const savingsPct = result.baselineCost === 0 ? 0 : (savings / result.baselineCost) * 100;
  console.log(`  savings vs 1-warehouse baseline: ${savings.toFixed(2)} (${savingsPct.toFixed(1)}%)`);

  check('returns k warehouses', result.warehouses.length === params.k);
  check('totalCost is finite and >= 0', Number.isFinite(result.totalCost) && result.totalCost >= 0);
  check('baselineCost is finite and >= 0', Number.isFinite(result.baselineCost) && result.baselineCost >= 0);
  check('optimized cost beats naive 1-warehouse baseline', result.totalCost <= result.baselineCost);
  check(
    'no neighborhood assigned twice',
    assigned.length === assignedSet.size,
  );
  check(
    'assigned and unserved are disjoint',
    [...assignedSet].every((id) => !unservedSet.has(id)),
  );
  check(
    'every neighborhood is assigned or unserved',
    allIds.every((id) => covered.has(id)) && covered.size === allIds.length,
  );

  const byId = new Map(SAMPLE_NEIGHBORHOODS.map((n) => [n.id, n]));
  let radiusOk = true;
  for (const w of result.warehouses) {
    for (const id of w.assignedNeighborhoodIds) {
      const n = byId.get(id);
      if (!n) continue;
      const d = haversineDistance(n.lat, n.lng, w.lat, w.lng);
      if (d > params.maxRadiusKm + 1e-9) radiusOk = false;
    }
  }
  check('served neighborhoods are within maxRadiusKm', radiusOk);

  let capacityOk = true;
  for (const w of result.warehouses) {
    const load = loadOf(w.assignedNeighborhoodIds, SAMPLE_NEIGHBORHOODS, demandMultiplier);
    if (load <= w.capacity + 1e-6) continue;

    const canRelocate = w.assignedNeighborhoodIds.some((id) => {
      const n = byId.get(id);
      if (!n) return false;
      const needed = n.orders * demandMultiplier;
      return result.warehouses.some((other) => {
        if (other.id === w.id) return false;
        const otherLoad = loadOf(
          other.assignedNeighborhoodIds,
          SAMPLE_NEIGHBORHOODS,
          demandMultiplier,
        );
        return other.capacity - otherLoad + 1e-6 >= needed;
      });
    });
    if (canRelocate) capacityOk = false;
  }
  check(
    'capacity pass moves overflow whenever another warehouse has room for it',
    capacityOk,
  );

  const tight = optimizeWarehouses(SAMPLE_NEIGHBORHOODS, {
    ...params,
    maxRadiusKm: 4,
  });
  check(
    'tight radius produces some unserved neighborhoods',
    tight.unservedNeighborhoodIds.length > 0,
    `${tight.unservedNeighborhoodIds.length} unserved`,
  );

  const grown = optimizeWarehouses(SAMPLE_NEIGHBORHOODS, {
    ...params,
    demandGrowthPercent: 50,
  });
  check(
    'demand growth scales baseline cost by 1.5x',
    Math.abs(grown.baselineCost / result.baselineCost - 1.5) < 1e-9,
    `${result.baselineCost.toFixed(0)} → ${grown.baselineCost.toFixed(0)}`,
  );

  const one = optimizeWarehouses(SAMPLE_NEIGHBORHOODS, { ...params, k: 1 });
  check(
    'k=1 cost is close to baseline (same idea, weighted vs unweighted center)',
    Math.abs(one.totalCost - one.baselineCost) / one.baselineCost < 0.15,
    `opt ${one.totalCost.toFixed(0)} vs baseline ${one.baselineCost.toFixed(0)}`,
  );

  const totalDemand = SAMPLE_NEIGHBORHOODS.reduce((sum, n) => sum + n.orders, 0);
  const autoCapacity = totalDemand / params.k;
  check(
    'omitted capacityPerWarehouse uses totalDemand / k',
    result.warehouses.every((w) => Math.abs(w.capacity - autoCapacity) < 1e-9),
    `default cap ${autoCapacity.toFixed(0)}`,
  );

  const manualCap = 250;
  const capped = optimizeWarehouses(SAMPLE_NEIGHBORHOODS, {
    ...params,
    capacityPerWarehouse: manualCap,
  });
  check(
    'capacityPerWarehouse override is stored on every warehouse',
    capped.warehouses.length === params.k &&
      capped.warehouses.every((w) => w.capacity === manualCap),
    `cap ${manualCap} (auto would be ${autoCapacity.toFixed(0)})`,
  );

  let manualCapHonored = true;
  for (const w of capped.warehouses) {
    const load = loadOf(w.assignedNeighborhoodIds, SAMPLE_NEIGHBORHOODS, 1);
    if (load <= w.capacity + 1e-6) continue;
    const canRelocate = w.assignedNeighborhoodIds.some((id) => {
      const n = byId.get(id);
      if (!n) return false;
      return capped.warehouses.some((other) => {
        if (other.id === w.id) return false;
        const otherLoad = loadOf(other.assignedNeighborhoodIds, SAMPLE_NEIGHBORHOODS, 1);
        return other.capacity - otherLoad + 1e-6 >= n.orders;
      });
    });
    if (canRelocate) manualCapHonored = false;
  }
  check(
    'manual cap is enforced when another warehouse still has room',
    manualCapHonored,
  );

  const baseline = getBaselineWarehouse(SAMPLE_NEIGHBORHOODS);
  const expectedLat =
    SAMPLE_NEIGHBORHOODS.reduce((sum, n) => sum + n.lat, 0) /
    SAMPLE_NEIGHBORHOODS.length;
  const expectedLng =
    SAMPLE_NEIGHBORHOODS.reduce((sum, n) => sum + n.lng, 0) /
    SAMPLE_NEIGHBORHOODS.length;
  const baselineLoad = loadOf(baseline.assignedNeighborhoodIds, SAMPLE_NEIGHBORHOODS, 1);
  const baselineIds = [...baseline.assignedNeighborhoodIds].sort();
  const sampleIds = [...allIds].sort();

  check(
    'getBaselineWarehouse sits at the unweighted centroid',
    Math.abs(baseline.lat - expectedLat) < 1e-9 &&
      Math.abs(baseline.lng - expectedLng) < 1e-9,
    `${baseline.lat.toFixed(4)}, ${baseline.lng.toFixed(4)}`,
  );
  check(
    'getBaselineWarehouse assigns every neighborhood once',
    baselineIds.length === sampleIds.length &&
      baselineIds.every((id, i) => id === sampleIds[i]),
  );
  check(
    'getBaselineWarehouse load equals total demand',
    Math.abs(baselineLoad - totalDemand) < 1e-9 &&
      Math.abs(baseline.capacity - totalDemand) < 1e-9,
    `load ${baselineLoad} / cap ${baseline.capacity}`,
  );

  const repeatCosts = Array.from(
    { length: 5 },
    () => optimizeWarehouses(SAMPLE_NEIGHBORHOODS, params).totalCost,
  );
  const minCost = Math.min(...repeatCosts);
  const maxCost = Math.max(...repeatCosts);
  const spread = maxCost - minCost;
  const allowed = Math.max(1e-6, minCost * 0.001);
  check(
    'restarts make totalCost stable across calls (within 0.1%)',
    spread <= allowed,
    `spread ${spread.toFixed(2)} over ${repeatCosts.map((c) => c.toFixed(0)).join(', ')}`,
  );

  const probeTarget = 74904.61;
  check(
    '20-restart default matches or beats the 40-restart probe',
    result.totalCost <= probeTarget + 0.05,
    `${result.totalCost.toFixed(2)} vs ${probeTarget.toFixed(2)}`,
  );

  const cost20 = result.totalCost;
  const cost40 = optimizeWarehouses(SAMPLE_NEIGHBORHOODS, params, 40).totalCost;
  console.log('\nRestart probe (production default is now 20):');
  console.log(`  20 restarts: ${cost20.toFixed(2)}`);
  console.log(`  40 restarts: ${cost40.toFixed(2)}`);
  console.log(
    `  delta:       ${(cost20 - cost40).toFixed(2)} (positive = 40 found a cheaper clustering)`,
  );

  console.log('\n--- done ---');
}

runSanityCheck();
