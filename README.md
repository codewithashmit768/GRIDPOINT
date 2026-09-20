# GridPoint — Warehouse Location Optimization Platform

**Team submission for Hack-a-Matics (Pentagram — The Mathematical Society of BMSCE, in collaboration with BMSCE IEEE Computer Society) | Theme: VECTOR | Problem Statement: GRIDPOINT**

GridPoint answers a simple but genuinely hard question: *given a set of neighborhoods with varying daily order volumes, where should a company place its warehouses, and which neighborhoods should each one serve, to minimize total delivery cost?*

## Demo Video

[Watch GridPoint Demo on YouTube](https://youtu.be/KgdHhhlIGj8)

---

## The Problem

An e-commerce company serves several neighborhoods from a central distribution network. Each neighborhood generates a different number of daily orders and sits at a different location. Naively, a company might just build one central warehouse — but that ignores the fact that demand isn't evenly distributed, and every extra kilometer of delivery distance costs money, scaled by how many orders travel that distance every single day.

GridPoint solves this as a **weighted facility location problem** and gives the user a live, visual, interactive tool to explore it.

---

## The Algorithm (our AI/technical component)

GridPoint's core is a **weighted k-means clustering algorithm (Lloyd's algorithm)**, implemented from scratch in TypeScript — not a call to an external AI model or LLM.

- **k-means++ seeding**: initial warehouse positions are chosen so they start spread out across the demand, rather than randomly clumping together.
- **Iterative refinement**: each neighborhood is assigned to its nearest warehouse (using the haversine formula for real geographic distance, not flat Euclidean distance on lat/lng), then each warehouse relocates to the order-weighted centroid of its assigned neighborhoods. This repeats until assignments stabilize.
- **Multi-restart search**: because k-means-style algorithms can land in a "good but not best" local optimum depending on random seeding, GridPoint runs the full process 20 times internally per request and keeps only the lowest-cost result. We verified this empirically — 20 restarts consistently matches the result of 40 restarts on our test data, confirming the algorithm reliably finds the true optimum rather than a lucky roll, while still completing in under 5ms.
- **Capacity-constrained reassignment**: after clustering converges, any warehouse exceeding its capacity has its farthest overflow neighborhoods greedily reassigned to the next-nearest warehouse with room. Neighborhoods are never split.
- **Radius-constrained service**: any neighborhood beyond the maximum delivery radius is explicitly flagged as unserved rather than force-assigned to a warehouse.

We chose a classical, well-understood optimization algorithm over an LLM-based approach because this is fundamentally a numerical optimization problem with a known, provably-good algorithmic solution — using an LLM here would add cost, latency, and non-determinism without improving correctness.

---

## Core Features (all required by the brief)

- **Flexible data input**: manually add neighborhoods one at a time, or upload a CSV (`name,lat,lng,orders` format).
- **Live map visualization**: every neighborhood plotted on an interactive Leaflet/OpenStreetMap view.
- **Adjustable warehouse count (k)**, run on demand.
- **Automatic optimization**: nearest-warehouse assignment, computed and drawn live — color-coded clusters, connecting lines from each warehouse to its assigned neighborhoods.
- **Cost calculation**: total weighted delivery cost, computed as orders x distance x fuel cost per km.
- **Before/after comparison**: a live toggle between the "Original" (naive single-warehouse) arrangement and the "Optimized" (multi-warehouse) result, each with its own cost badge directly on the map.
- **Capacity and radius constraints**, both enforced and visualized (dashed service-radius circles, red markers for unserved neighborhoods).

---

## Bonus Features (7 of 8 listed in the brief)

| Feature | Status |
|---|---|
| Support multiple warehouses | Done |
| Limited warehouse capacity | Done |
| Maximum delivery radius | Done |
| Different vehicle types | Done — Fleet Vehicle Profiles (EV Van / Diesel Van / Freight Truck), each presetting a realistic fuel-cost and service-radius combination |
| Fuel costs | Done — folded directly into the cost formula |
| Traffic-dependent delivery times | Not implemented — deliberately. We didn't have a real traffic data source, and simulating one with made-up multipliers risked producing an unsubstantiated number we couldn't defend if asked how it was derived. We prioritized correctness over checkbox completeness. |
| Model changes in customer demand | Done — Simulated Demand Growth slider, scales all order volumes before re-optimizing |
| Trade-off: infrastructure cost vs. delivery cost | Done — live "Cost vs Warehouses" chart, showing the diminishing-returns curve as warehouse count increases |

---

## Beyond the brief

A few things we built that weren't asked for, but reflect real engineering care:

- **A 20+ check automated test suite** (`npm run sanity`) validating the algorithm's correctness — every neighborhood assigned exactly once, capacity and radius constraints genuinely enforced (not just accepted and ignored), cost consistency, and result stability across repeated runs.
- **Verified algorithmic optimality**: we didn't just assume 20 restarts was "enough" — we empirically confirmed it against 40 restarts and found identical results.
- **Stale-result safeguards**: if the neighborhood dataset changes after a run (manual add, CSV upload, or reset), the UI explicitly flags every displayed cost figure as stale until the user re-optimizes, rather than silently showing outdated numbers.
- **A degenerate-result guard**: the warehouse count slider is dynamically capped below the loaded neighborhood count, preventing a meaningless "one warehouse per neighborhood, 100% savings" result.

---

## Tech Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** (via the `@tailwindcss/vite` plugin)
- **Leaflet + react-leaflet** for map rendering
- **Recharts** for the cost-vs-warehouses chart
- No backend — the entire application, including the optimization algorithm, runs client-side in the browser.

The initial project was scaffolded using Vite's official `react-ts` starter template (`npm create vite@latest -- --template react-ts`); all application logic, components, and the optimization engine were written by the team during the hackathon.

---

## Running Locally

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

To run the algorithm's test suite:

```bash
npm run sanity
```

To see the cost-vs-warehouses trade-off analysis independently:

```bash
npm run tradeoff
```

---

## Quick Start (First Run)

1. Run the app: `npm run dev`
2. Load sample data: click **"Load Sample Neighborhoods"** to populate 12 neighborhoods around Bengaluru
3. Set warehouse count: move the **"Warehouses (k)"** slider to 3
4. Click **"Run Optimization"** — the map will cluster neighborhoods and compute cost
5. Click **"Original"** toggle to see the naive single-warehouse baseline
6. Click **"Optimized"** to see the optimized multi-warehouse layout — notice the cost savings
7. Explore: try k=1, k=4, k=6 and watch the "Cost vs Warehouses" chart show diminishing returns

---

## Future Work

One idea we explored but didn't merge into the final build, in the interest of not introducing an untested dependency this close to the deadline: an **AI-generated business insights layer**, where the optimization result would be sent to an LLM (Gemini) to produce a short, plain-language explanation of why the recommended warehouse count makes sense, the cost/capacity trade-offs, and what happens as demand grows. We'd like to revisit this with more time, ideally with graceful fallback if the API is unavailable.

---

## Team

- Aryaveer — optimization algorithm, testing, and full application integration
- aravpriyadarshi — Control Panel and Data Input components
- Ashmit Kumar (codewithashmit768) — Map visualization
- Ayush Mhetre (ayushmhetre725) — Cost trade-off exploration