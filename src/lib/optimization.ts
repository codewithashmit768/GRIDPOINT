import { haversineDistance } from './haversine.ts';
import type {
  Neighborhood,
  OptimizationParams,
  OptimizationResult,
  Warehouse,
} from '../types.ts';

const MAX_LLOYD_ITERATIONS = 50;
const MAX_CAPACITY_PASSES = 50;

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
 *   6. Cost vs. a naive single-warehouse baseline at the unweighted centroid
 */
export function optimizeWarehouses(
  neighborhoods: Neighborhood[],
  params: OptimizationParams,
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
  // Fair share of total demand — not on OptimizationParams, so implied by k.
  // Neighborhoods are not split, so a warehouse can still sit slightly over
  // this cap if its remaining overflow is larger than anyone else's leftover room.
  const capacity = totalDemand / k;

  const centers = seedKMeansPlusPlus(scaled, k);
  const assignments = runLloyd(scaled, centers);

  const warehouses = buildWarehouses(scaled, centers, assignments, capacity);
  applyCapacityPass(warehouses, scaled);
  const unservedNeighborhoodIds = applyRadiusPass(
    warehouses,
    scaled,
    params.maxRadiusKm,
  );

  const byId = new Map(scaled.map((n) => [n.id, n]));
  const totalCost = computeServedCost(
    warehouses,
    byId,
    params.fuelCostPerKm,
  );

  return {
    warehouses,
    unservedNeighborhoodIds,
    totalCost,
    baselineCost,
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
 * k-means++ seeding: first center uniform-random, each next center sampled
 * with probability proportional to squared distance to the nearest existing
 * center. That spreads warehouses out instead of stacking them in one cluster.
 */
function seedKMeansPlusPlus(
  neighborhoods: Neighborhood[],
  k: number,
): LatLng[] {
  const first = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
  const centers: LatLng[] = [{ lat: first.lat, lng: first.lng }];

  while (centers.length < k) {
    const weights = neighborhoods.map((n) => {
      const nearest = minDistanceToCenters(n, centers);
      return nearest * nearest;
    });
    const picked = sampleByWeight(neighborhoods, weights);
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
): Neighborhood {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
  }

  let r = Math.random() * total;
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
