# GRIDPOINT — Warehouse Location Optimization Platform
### Hack-a-Matics 24hr Hackathon — Theme: VECTOR
Team: Aryaveer (lead/integration + optimization), + 3 teammates

This is the single source of truth for the project. Everyone — regardless of which AI tool you're using (Cursor, ChatGPT, whatever) — should paste the relevant section below into your AI to get full context before asking it to write code. Keep this file open/pinned and re-sync against it, not against each other's memory of a conversation.

---

## 1. Problem Statement (from official brochure)

**Background:** An e-commerce company serves several neighborhoods from a central distribution network. Each neighborhood has a different number of daily orders and a different geographic position. The company wants to establish one or more warehouses such that overall delivery effort and cost are minimized.

**Task:** Build a Warehouse Location Optimization Platform that determines where the warehouse(s) should be located and which neighborhoods should be assigned to each warehouse. Minimize weighted delivery cost, where neighborhoods with more orders contribute more heavily to the objective.

**Core requirements (from brochure):**
1. Upload or enter neighborhood data (location + daily orders)
2. Visualize all neighborhood locations on a map
3. Let user select number of warehouses (k)
4. Run an optimization algorithm to determine warehouse locations
5. Assign each neighborhood to its nearest/optimal warehouse
6. Calculate total delivery distance and cost
7. Display optimized warehouse locations and assignments
8. Compare original arrangement with optimized arrangement
9. Consider warehouse capacity and max service radius where applicable

**Bonus features we are building (locked in):**
- Warehouse capacity limits (capacitated reassignment)
- Maximum delivery radius (flag unserved/over-limit neighborhoods)
- Fuel costs (multiplier folded into cost formula)
- Trade-off exploration + demand growth (combined: cost-vs-k chart with a demand-growth slider)

**Explicitly NOT doing:** vehicle types, traffic-dependent delivery times (both dropped — low payoff for the time cost, and traffic without a real data source risks looking hardcoded/fabricated to judges).

---

## 2. The Algorithm (everyone should understand this, not just the person coding it)

This is a **weighted k-means / capacitated facility location problem**, solved via **Lloyd's algorithm**:

1. Pick k initial warehouse locations.
2. Assign each neighborhood to its nearest warehouse, using **haversine distance** (not raw Euclidean on lat/lng — degrees of longitude aren't constant physical distance).
3. Recompute each warehouse's location as the **order-weighted centroid** of its currently assigned neighborhoods.
4. Repeat steps 2–3 until assignments stop changing.
5. **Capacity pass:** if a warehouse's total assigned orders exceed its capacity, greedily reassign its farthest overflow neighborhoods to the next-nearest warehouse with room.
6. **Radius pass:** flag any neighborhood whose distance to its assigned warehouse exceeds the max service radius (mark as "unserved" rather than force-assigning it).

**Cost formula:**
```
cost = Σ (orders_i × haversine_distance(neighborhood_i, its_warehouse) × fuel_cost_per_km)
```

**Baseline for comparison:** one single warehouse placed at the unweighted geographic center of all neighborhoods. Show baseline cost vs. optimized cost side by side — this satisfies requirement #8.

---

## 3. Tech Stack

- Vite + React + TypeScript
- Tailwind CSS
- Leaflet + react-leaflet (map)
- No backend, no database. Everything runs client-side in React state.
- Recharts or similar for the cost-vs-k chart (Sprint 3 bonus feature)

---

## 4. Data Types (everyone builds against this exact shape — do not invent your own)

```typescript
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
  capacity: number;          // max total orders it can serve
  assignedNeighborhoodIds: string[];
}

export interface OptimizationResult {
  warehouses: Warehouse[];
  unservedNeighborhoodIds: string[]; // exceeded max radius
  totalCost: number;
  baselineCost: number;              // single central warehouse, for comparison
}

export interface OptimizationParams {
  k: number;                 // number of warehouses
  maxRadiusKm: number;
  fuelCostPerKm: number;
  demandGrowthPercent: number; // 0 = current demand, 50 = +50% orders
}
```

**Core function signature (this is what everyone else's UI calls into):**
```typescript
function optimizeWarehouses(
  neighborhoods: Neighborhood[],
  params: OptimizationParams
): OptimizationResult
```

---

## 5. File Ownership (work on your own files, minimizes merge conflicts)

| Person | Branch | Files owned |
|---|---|---|
| Aryaveer (you) | `feature/optimization` | `src/lib/optimization.ts`, `src/lib/haversine.ts`, final wiring in `src/App.tsx` |
| Teammate 2 | `feature/map-view` | `src/components/MapView.tsx` |
| Teammate 3 | `feature/data-input` | `src/components/ControlPanel.tsx`, `src/components/DataInput.tsx`, `src/data/sampleNeighborhoods.ts` |
| Teammate 4 | `feature/cost-chart` | `src/components/CostChart.tsx`, `README.md`, demo video |

Build your component against the `OptimizationResult` / `Neighborhood` / `Warehouse` types above even before the real algorithm exists — use dummy/mock data to develop against, then swap in the real function once it's ready.

---

## 6. Git Workflow

Repo: (fill in URL once created)

Setup (once):
```powershell
git clone <repo-url>
cd gridpoint
npm install
git checkout -b feature/<your-feature-name>
```

While working (every 30–60 min):
```powershell
git add .
git commit -m "short description of what changed"
git push origin feature/<your-feature-name>
```

At every break, Aryaveer merges everything into `main`:
```powershell
git checkout main
git pull origin main
git merge feature/map-view
git merge feature/data-input
git merge feature/cost-chart
git merge feature/optimization
git push origin main
```

Then everyone else syncs their branch against the updated main:
```powershell
git checkout feature/<your-feature-name>
git merge main
```

If a merge conflict shows `<<<<<<<` / `=======` / `>>>>>>>` markers, resolve manually, then `git add .` and `git commit`. `App.tsx` is the most likely conflict point since everyone's work connects there — Aryaveer handles those merges carefully.

---

## 7. Schedule (matches official event timing)

| Time | Focus |
|---|---|
| Now – 5:30 PM | Repo setup, scaffolding, role confirmation (no project-specific logic yet) |
| 5:30–6:00 PM | Opening ceremony |
| 6:00–9:00 PM | Sprint 1: skeleton — data input, sample dataset, plain map with markers |
| 9:00–10:00 PM | Break — sync check |
| 10:00 PM–6:00 AM | Sprint 2: core algorithm, cost calc, live map updates on optimize |
| 6:00–7:00 AM | Break |
| 7:00 AM–12:00 PM | Sprint 3: bonus features (capacity, radius, fuel cost, cost-vs-k chart) |
| 12:00–1:00 PM | Break |
| 1:00–5:00 PM | Sprint 4: bug fixes, README, demo video recording |
| 5:00 PM | Submission form live |
| 5:00–5:50 PM | Final push, fill submission form |
| 5:50–6:00 PM | Buffer — submit early |

---

## 8. Definition of Done (demo checklist before 5 PM)

- [ ] Can add/upload neighborhood data
- [ ] Map shows neighborhoods before optimizing
- [ ] Selecting k and clicking optimize updates map with color-coded clusters + warehouse markers
- [ ] Cost number displayed, baseline vs optimized both visible
- [ ] Capacity limit and max radius both functionally affect the output (not just UI inputs that do nothing)
- [ ] Cost-vs-k chart with demand-growth slider works
- [ ] README clearly states the "AI component" used (the optimization algorithm) and any boilerplate/templates used
- [ ] Public GitHub repo, all code committed
- [ ] 2–3 min demo video recorded
