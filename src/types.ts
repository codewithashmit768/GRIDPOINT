export interface Neighborhood {
  id: string;
  name: string;
  lat: number;
  lng: number;
  orders: number;
}

export interface Warehouse {
  id: string;
  lat: number;
  lng: number;
  capacity: number; // max total orders it can serve
  assignedNeighborhoodIds: string[];
}

export interface OptimizationResult {
  warehouses: Warehouse[];
  unservedNeighborhoodIds: string[]; // exceeded max radius
  totalCost: number;
  baselineCost: number; // single central warehouse, for comparison
}

export interface OptimizationParams {
  k: number; // number of warehouses
  maxRadiusKm: number;
  fuelCostPerKm: number;
  demandGrowthPercent: number; // 0 = current demand, 50 = +50% orders
  capacityPerWarehouse?: number; // hard cap for every warehouse; omit for totalDemand / k
}
