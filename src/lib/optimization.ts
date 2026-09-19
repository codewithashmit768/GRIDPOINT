import { haversineDistance } from './haversine.ts';
import type {
  Neighborhood,
  OptimizationParams,
  OptimizationResult,
  Warehouse,
} from '../types.ts';

export type { OptimizationResult };

const MAX_LLOYD_ITERATIONS = 50;
const MAX_CAPACITY_PASSES = 50;
/** k-means++ is random — keep the best of several seeded full runs. */
const RESTARTS = 20;

interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Place k warehouses to minimize order-weighted delivery cost.
 *
 * Pipeline:
 *   1. Scale demand by params.demandGrowthPercent
 *   2. Seed k centers with k-means++ (D² sampling)
 *   3. Lloyd iteration: nearest-warehouse assign → order-weighted centroid
 *   4. Capacity pass: overflow the farthest neighborhoods to the next warehouse with room
 *   5. Radius pass: neighborhoods beyond maxRadiusKm become unserved
 *   6. Repeat 4–5 so capacity freed by unserved neighborhoods can take leftover overflow
 *   7. Cost vs. a naive single-warehouse baseline at the unweighted centroid
 *   8. Restart 2–6 several times and keep the lowest totalCost
 */
export function optimizeWarehouses(
  neighborhoods: Neighborhood[],
  params: OptimizationParams,
  restartCount: number = RESTARTS,
): OptimizationResult {
  if (neighborhoods.length === 0) {
    return {
      warehouses: [],
      unservedNeighborhoodIds: [],
      totalCost: 0,
      baselineCost: 0,
    };
  }

  const demandMultiplier = 1 + params.demandGrowthPercent / 100;
  const scaled: Neighborhood[] = neighborhoods.map((n) => ({
    ...n,
    orders: n.orders * demandMultiplier,
  }));

  const baselineCost = computeBaselineCost(scaled, params.fuelCostPerKm);

  const k = Math.max(0, Math.min(Math.floor(params.k), scaled.length));
  if (k === 0) {
    return {
      warehouses: [],
      unservedNeighborhoodIds: scaled.map((n) => n.id),
      totalCost: 0,
      baselineCost,
    };
  }

  const totalDemand = scaled.reduce((sum, n) => sum + n.orders, 0);
  // Manual cap wins when provided; otherwise each warehouse's fair share.
  // Neighborhoods are not split, so a warehouse can still sit slightly over
  // this cap if its remaining overflow is larger than anyone else's leftover room.
  const capacity =
    params.capacityPerWarehouse !== undefined
      ? params.capacityPerWarehouse
      : totalDemand / k;

  const seed = hashSeed(scaled, params, capacity);
  const attempts = Math.max(1, Math.floor(restartCount));
  let best = runOnce(scaled, k, capacity, params, baselineCost, mulberry32(seed));
  for (let i = 1; i < attempts; i++) {
    const next = runOnce(
      scaled,
      k,
      capacity,
      params,
      baselineCost,
      mulberry32(seed + i * 0x9e3779b9),
    );
    if (next.totalCost < best.totalCost) {
      best = next;
    }
  }
  return best;
}

function runOnce(
  scaled: Neighborhood[],
  k: number,
  capacity: number,
  params: OptimizationParams,
  baselineCost: number,
  rng: () => number,
): OptimizationResult {
  const centers = seedKMeansPlusPlus(scaled, k, rng);
  const assignments = runLloyd(scaled, centers);
  const warehouses = buildWarehouses(scaled, centers, assignments, capacity);
  const unservedNeighborhoodIds = applyCapacityAndRadius(
    warehouses,
    scaled,
    params.maxRadiusKm,
  );
  const byId = new Map(scaled.map((n) => [n.id, n]));
  const totalCost = computeServedCost(warehouses, byId, params.fuelCostPerKm);

  return {
    warehouses,
    unservedNeighborhoodIds,
    totalCost,
    baselineCost,
  };
}

/**
 * Naive "before" state for the map: one warehouse at the unweighted centroid,
 * with every neighborhood assigned. Load (sum of assigned orders) equals
 * total demand; capacity is set to the same so the baseline can serve everyone.
 */
export function getBaselineWarehouse(neighborhoods: Neighborhood[]): Warehouse {
  const totalDemand = neighborhoods.reduce((sum, n) => sum + n.orders, 0);
  const centroid =
    neighborhoods.length === 0
      ? { lat: 0, lng: 0 }
      : unweightedCentroid(neighborhoods);

  return {
    id: 'wh-baseline',
    lat: centroid.lat,
    lng: centroid.lng,
    capacity: totalDemand,
    assignedNeighborhoodIds: neighborhoods.map((n) => n.id),
  };
}

/** Single warehouse at the unweighted geographic center of every neighborhood. */
function computeBaselineCost(
  neighborhoods: Neighborhood[],
  fuelCostPerKm: number,
): number {
  const centroid = unweightedCentroid(neighborhoods);
  let cost = 0;
  for (const n of neighborhoods) {
    cost +=
      n.orders *
      haversineDistance(n.lat, n.lng, centroid.lat, centroid.lng) *
      fuelCostPerKm;
  }
  return cost;
}

function unweightedCentroid(points: LatLng[]): LatLng {
  const n = points.length;
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / n, lng: lng / n };
}

/**
 * Order-weighted centroid: neighborhoods with more daily orders pull the
 * warehouse closer, since they dominate the cost sum.
 */
function orderWeightedCentroid(points: Neighborhood[]): LatLng {
  let totalOrders = 0;
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    totalOrders += p.orders;
    lat += p.lat * p.orders;
    lng += p.lng * p.orders;
  }
  if (totalOrders <= 0) {
    return unweightedCentroid(points);
  }
  return { lat: lat / totalOrders, lng: lng / totalOrders };
}

/**
 * FNV-1a-ish mix so the same neighborhoods + params always produce the same
 * 8 restart seeds (clicking Optimize twice should not jump the warehouses).
 */
function hashSeed(
  neighborhoods: Neighborhood[],
  params: OptimizationParams,
  capacity: number,
): number {
  let h = 2166136261;
  const mix = (x: number) => {
    h ^= x >>> 0;
    h = Math.imul(h, 16777619);
  };
  for (const n of neighborhoods) {
    mix(Math.round(n.lat * 1e5));
    mix(Math.round(n.lng * 1e5));
    mix(Math.round(n.orders * 1e3));
    for (let i = 0; i < n.id.length; i++) mix(n.id.charCodeAt(i));
  }
  mix(params.k);
  mix(Math.round(params.maxRadiusKm * 1e3));
  mix(Math.round(params.fuelCostPerKm * 1e3));
  mix(Math.round(params.demandGrowthPercent * 1e3));
  mix(Math.round(capacity * 1e3));
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * k-means++ seeding: first center uniform-random, each next center sampled
 * with probability proportional to squared distance to the nearest existing
 * center. That spreads warehouses out instead of stacking them in one cluster.
 */
function seedKMeansPlusPlus(
  neighborhoods: Neighborhood[],
  k: number,
  rng: () => number,
): LatLng[] {
  const first = neighborhoods[Math.floor(rng() * neighborhoods.length)];
  const centers: LatLng[] = [{ lat: first.lat, lng: first.lng }];

  while (centers.length < k) {
    const weights = neighborhoods.map((n) => {
      const nearest = minDistanceToCenters(n, centers);
      return nearest * nearest;
    });
    const picked = sampleByWeight(neighborhoods, weights, rng);
    centers.push({ lat: picked.lat, lng: picked.lng });
  }

  return centers;
}

function minDistanceToCenters(point: LatLng, centers: LatLng[]): number {
  let best = Infinity;
  for (const c of centers) {
    const d = haversineDistance(point.lat, point.lng, c.lat, c.lng);
    if (d < best) best = d;
  }
  return best;
}

function sampleByWeight(
  neighborhoods: Neighborhood[],
  weights: number[],
  rng: () => number,
): Neighborhood {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return neighborhoods[Math.floor(rng() * neighborhoods.length)];
  }

  let r = rng() * total;
  for (let i = 0; i < neighborhoods.length; i++) {
    r -= weights[i];
    if (r <= 0) return neighborhoods[i];
  }
  return neighborhoods[neighborhoods.length - 1];
}

/**
 * Lloyd's algorithm: alternate assignment and centroid updates until the
 * assignment vector is unchanged, or we hit MAX_LLOYD_ITERATIONS.
 */
function runLloyd(neighborhoods: Neighborhood[], centers: LatLng[]): number[] {
  let assignments = assignToNearest(neighborhoods, centers);

  for (let iter = 0; iter < MAX_LLOYD_ITERATIONS; iter++) {
    updateCentroids(neighborhoods, centers, assignments);
    const next = assignToNearest(neighborhoods, centers);
    if (sameAssignments(assignments, next)) {
      assignments = next;
      break;
    }
    assignments = next;
  }

  return assignments;
}

function assignToNearest(
  neighborhoods: Neighborhood[],
  centers: LatLng[],
): number[] {
  return neighborhoods.map((n) => {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < centers.length; i++) {
      const d = haversineDistance(n.lat, n.lng, centers[i].lat, centers[i].lng);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }
    return bestIndex;
  });
}

function updateCentroids(
  neighborhoods: Neighborhood[],
  centers: LatLng[],
  assignments: number[],
): void {
  for (let i = 0; i < centers.length; i++) {
    const members = neighborhoods.filter((_, idx) => assignments[idx] === i);
    if (members.length === 0) continue; // keep previous location
    const centroid = orderWeightedCentroid(members);
    centers[i] = centroid;
  }
}

function sameAssignments(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function buildWarehouses(
  neighborhoods: Neighborhood[],
  centers: LatLng[],
  assignments: number[],
  capacity: number,
): Warehouse[] {
  return centers.map((c, i) => ({
    id: `wh-${i + 1}`,
    lat: c.lat,
    lng: c.lng,
    capacity,
    assignedNeighborhoodIds: neighborhoods
      .filter((_, idx) => assignments[idx] === i)
      .map((n) => n.id),
  }));
}

function warehouseLoad(
  warehouse: Warehouse,
  byId: Map<string, Neighborhood>,
): number {
  let load = 0;
  for (const id of warehouse.assignedNeighborhoodIds) {
    const n = byId.get(id);
    if (n) load += n.orders;
  }
  return load;
}

/**
 * While a warehouse is over capacity, peel off its farthest neighborhoods
 * and hand them to the next-nearest warehouse that still has room.
 * Repeats across warehouses because a move can overflow the receiver.
 */
function applyCapacityPass(
  warehouses: Warehouse[],
  neighborhoods: Neighborhood[],
): void {
  const byId = new Map(neighborhoods.map((n) => [n.id, n]));

  for (let pass = 0; pass < MAX_CAPACITY_PASSES; pass++) {
    let moved = false;

    for (const warehouse of warehouses) {
      while (warehouseLoad(warehouse, byId) > warehouse.capacity) {
        const overflow = assignedSortedFarthestFirst(warehouse, byId);
        let relocated = false;

        for (const neighborhood of overflow) {
          const destination = nextNearestWithRoom(
            neighborhood,
            warehouse,
            warehouses,
            byId,
          );
          if (!destination) continue;

          warehouse.assignedNeighborhoodIds =
            warehouse.assignedNeighborhoodIds.filter(
              (id) => id !== neighborhood.id,
            );
          destination.assignedNeighborhoodIds.push(neighborhood.id);
          relocated = true;
          moved = true;
          break;
        }

        if (!relocated) break;
      }
    }

    if (!moved) break;
  }
}

/**
 * Capacity then radius, repeating so holes left by unserved neighborhoods
 * can absorb leftover overflow. Radius can free capacity after the first
 * pass; without a second capacity pass those holes stay empty while another
 * warehouse remains over cap.
 */
function applyCapacityAndRadius(
  warehouses: Warehouse[],
  neighborhoods: Neighborhood[],
  maxRadiusKm: number,
): string[] {
  const unserved = new Set<string>();
  let previous = '';

  for (let i = 0; i < MAX_CAPACITY_PASSES; i++) {
    applyCapacityPass(warehouses, neighborhoods);
    for (const id of applyRadiusPass(warehouses, neighborhoods, maxRadiusKm)) {
      unserved.add(id);
    }

    const snapshot = warehouses
      .map((w) => `${w.id}:${w.assignedNeighborhoodIds.join(',')}`)
      .join('|');
    if (snapshot === previous) break;
    previous = snapshot;
  }

  return [...unserved];
}

function assignedSortedFarthestFirst(
  warehouse: Warehouse,
  byId: Map<string, Neighborhood>,
): Neighborhood[] {
  return warehouse.assignedNeighborhoodIds
    .map((id) => byId.get(id))
    .filter((n): n is Neighborhood => n !== undefined)
    .sort((a, b) => {
      const da = haversineDistance(a.lat, a.lng, warehouse.lat, warehouse.lng);
      const db = haversineDistance(b.lat, b.lng, warehouse.lat, warehouse.lng);
      return db - da;
    });
}

function nextNearestWithRoom(
  neighborhood: Neighborhood,
  current: Warehouse,
  warehouses: Warehouse[],
  byId: Map<string, Neighborhood>,
): Warehouse | null {
  const ranked = warehouses
    .filter((w) => w.id !== current.id)
    .map((w) => ({
      warehouse: w,
      distance: haversineDistance(
        neighborhood.lat,
        neighborhood.lng,
        w.lat,
        w.lng,
      ),
    }))
    .sort((a, b) => a.distance - b.distance);

  for (const { warehouse } of ranked) {
    const remaining = warehouse.capacity - warehouseLoad(warehouse, byId);
    if (remaining + 1e-9 >= neighborhood.orders) {
      return warehouse;
    }
  }
  return null;
}

/**
 * Drop assignments that violate the service radius. We do not force a
 * different warehouse — over-radius neighborhoods are reported as unserved.
 */
function applyRadiusPass(
  warehouses: Warehouse[],
  neighborhoods: Neighborhood[],
  maxRadiusKm: number,
): string[] {
  const byId = new Map(neighborhoods.map((n) => [n.id, n]));
  const unserved: string[] = [];

  for (const warehouse of warehouses) {
    const kept: string[] = [];
    for (const id of warehouse.assignedNeighborhoodIds) {
      const n = byId.get(id);
      if (!n) continue;
      const d = haversineDistance(n.lat, n.lng, warehouse.lat, warehouse.lng);
      if (d > maxRadiusKm) {
        unserved.push(id);
      } else {
        kept.push(id);
      }
    }
    warehouse.assignedNeighborhoodIds = kept;
  }

  return unserved;
}

function computeServedCost(
  warehouses: Warehouse[],
  byId: Map<string, Neighborhood>,
  fuelCostPerKm: number,
): number {
  let cost = 0;
  for (const warehouse of warehouses) {
    for (const id of warehouse.assignedNeighborhoodIds) {
      const n = byId.get(id);
      if (!n) continue;
      cost +=
        n.orders *
        haversineDistance(n.lat, n.lng, warehouse.lat, warehouse.lng) *
        fuelCostPerKm;
    }
  }
  return cost;
}
