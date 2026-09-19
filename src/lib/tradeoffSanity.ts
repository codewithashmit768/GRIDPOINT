import { sampleNeighborhoods } from '../data/sampleNeighborhoods.ts';
import {
  generateCostVsKData,
  generateDemandGrowthData,
} from './tradeoffAnalysis.ts';

function pad(value: string, width: number): string {
  return value.padStart(width);
}

function money(n: number): string {
  return n.toFixed(2);
}

/**
 * Manual check — run from the project root:
 *   npx tsx src/lib/tradeoffSanity.ts
 */
function runTradeoffSanityCheck(): void {
  const maxRadiusKm = 25;
  const fuelCostPerKm = 1;
  const maxK = 8;
  const k = 3;
  const growthSteps = [0, 20, 50, 100];

  console.log('--- GRIDPOINT trade-off sanity check ---');
  console.log(
    `sample: ${sampleNeighborhoods.length} Bengaluru neighborhoods, radius=${maxRadiusKm}km, fuel=${fuelCostPerKm}/km\n`,
  );

  const vsK = generateCostVsKData(
    sampleNeighborhoods,
    maxK,
    maxRadiusKm,
    fuelCostPerKm,
  );

  console.log('cost vs k (demand growth = 0%)');
  console.log(
    `${pad('k', 4)}  ${pad('totalCost', 12)}  ${pad('unserved', 8)}  delta vs k-1`,
  );
  vsK.forEach((row, i) => {
    const prev = i === 0 ? null : vsK[i - 1];
    const delta =
      prev === null ? '—' : `${(row.totalCost - prev.totalCost).toFixed(2)}`;
    console.log(
      `${pad(String(row.k), 4)}  ${pad(money(row.totalCost), 12)}  ${pad(String(row.unservedCount), 8)}  ${delta}`,
    );
  });

  const first = vsK[0];
  const last = vsK[vsK.length - 1];
  if (first && last) {
    const drop = ((first.totalCost - last.totalCost) / first.totalCost) * 100;
    console.log(
      `\nk=1 → k=${last.k}: cost ${drop >= 0 ? 'down' : 'up'} ${Math.abs(drop).toFixed(1)}% (expect generally down, with diminishing returns)\n`,
    );
  }

  const vsGrowth = generateDemandGrowthData(
    sampleNeighborhoods,
    k,
    maxRadiusKm,
    fuelCostPerKm,
    growthSteps,
  );

  console.log(`demand growth at k=${k}`);
  console.log(
    `${pad('growth%', 8)}  ${pad('totalCost', 12)}  ${pad('unserved', 8)}  vs 0% growth`,
  );
  const base = vsGrowth[0];
  for (const row of vsGrowth) {
    const vsBase =
      !base || base.totalCost === 0
        ? '—'
        : `${((row.totalCost / base.totalCost) * 100).toFixed(0)}%`;
    console.log(
      `${pad(String(row.growthPercent), 8)}  ${pad(money(row.totalCost), 12)}  ${pad(String(row.unservedCount), 8)}  ${vsBase}`,
    );
  }

  console.log(
    '\nexpect: cost rises as growth% rises (orders scale up before the optimizer runs)',
  );
  console.log('--- done ---');
}

runTradeoffSanityCheck();
