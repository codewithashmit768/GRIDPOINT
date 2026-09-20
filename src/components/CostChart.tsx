  import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } from 'recharts';
  import type { Neighborhood } from '../types.ts';

  export type CostHistoryPoint = {
    k: number;
    totalCost: number;
  };

  interface CostChartProps {
    neighborhoods: Neighborhood[];
    numberOfWarehouses: number;
    costHistory: CostHistoryPoint[];
  }

  export function CostChart({
    neighborhoods,
    numberOfWarehouses,
    costHistory,
  }: CostChartProps) {
    const xMax = Math.max(1, neighborhoods.length);
    const sorted = [...costHistory].sort((a, b) => a.k - b.k);

    return (
      <div className="h-52 w-full">
        {sorted.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">
            Click Run Optimization to plot cost vs number of warehouses.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sorted}
              margin={{ top: 8, right: 12, bottom: 20, left: 8 }}
            >
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="k"
                type="number"
                domain={[1, xMax]}
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                label={{
                  value: 'Number of Warehouses',
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <YAxis
                dataKey="totalCost"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(value: number) =>
                  `₹${Math.round(value).toLocaleString()}`
                }
                width={64}
                label={{
                  value: 'Total Cost (₹)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 8,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <Tooltip
                isAnimationActive={false}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#e2e8f0',
                }}
                formatter={(value) => [
                  `₹${Number(value).toFixed(2)}`,
                  'Total cost',
                ]}
                labelFormatter={(label) => `k = ${label}`}
              />
              <Line
                type="monotone"
                dataKey="totalCost"
                stroke="#818cf8"
                strokeWidth={2}
                isAnimationActive={false}
                dot={(props) => {
                  const { cx, cy, payload, index } = props;
                  if (cx == null || cy == null || !payload) return null;
                  const active = payload.k === numberOfWarehouses;
                  return (
                    <circle
                      key={`dot-${String(index)}`}
                      cx={cx}
                      cy={cy}
                      r={active ? 6 : 3}
                      fill={active ? '#c7d2fe' : '#6366f1'}
                      stroke={active ? '#eef2ff' : '#818cf8'}
                      strokeWidth={active ? 2 : 1}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }
