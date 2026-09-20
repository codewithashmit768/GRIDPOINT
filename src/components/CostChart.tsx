import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function CostChart() {
  const [demandGrowth, setDemandGrowth] = useState(0);
  const [dailyDemand, setDailyDemand] = useState(500);
  const [warehouseCapacity, setWarehouseCapacity] = useState(150);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Demand after considering growth
  const adjustedDemand =
    dailyDemand * (1 + demandGrowth / 100);

  // Minimum warehouses required to handle demand
  const requiredWarehouses = Math.ceil(
    adjustedDemand / warehouseCapacity
  );

  

  
  // Generate warehouse options from 1 to 15
  const chartData = Array.from(
    { length: 15 },
    (_, index) => {
      const k = index + 1;

      // Fixed operating cost
      const warehouseCost = k * 1000;

      // Delivery cost decreases as warehouses increase
      const deliveryCost =
        (adjustedDemand * 30) / Math.sqrt(k);

      // Total cost
      const totalCost =
        warehouseCost + deliveryCost;

      return {
        k,
        cost: totalCost,
      };
    }
  );

  // Only consider warehouse options that can handle demand
  const feasibleData = chartData.filter(
    (item) => item.k >= requiredWarehouses
  );

  // Find the lowest-cost feasible option
  const optimal =
    feasibleData.length > 0
      ? feasibleData.reduce((best, item) =>
          item.cost < best.cost ? item : best
        )
      : null;
      const generateAIInsights = async () => {
  setAiLoading(true);

  try {
    const response = await fetch(
      "http://localhost:3001/api/ai-insights",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adjustedDemand,
          requiredWarehouses,
          recommendedWarehouses: optimal?.k ?? requiredWarehouses,
          warehouseCapacity,
          demandGrowth,
          minimumCost: optimal?.cost ?? 0,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate AI insight");
    }

    setAiInsight(data.insight);
  } catch (error) {
    console.error("AI insight error:", error);

    setAiInsight(
      "Unable to generate AI insights right now. Please make sure the GridPoint AI server is running."
    );
  } finally {
    setAiLoading(false);
  }
};

  return (
    <div className="app">
      <div className="app-container">

        {/* HEADER */}
        <div className="app-header">
          <h1>GridPoint</h1>
          <p>Smart Warehouse Optimization Dashboard</p>
        </div>

        {/* CONTROLS */}
        <div className="controls-card">
          <h2>Demand Parameters</h2>

          <div className="control-group">
            <label>
              Demand Growth: {demandGrowth}%
            </label>

            <input
              type="range"
              min="0"
              max="50"
              value={demandGrowth}
              onChange={(e) =>
                setDemandGrowth(
                  Number(e.target.value)
                )
              }
            />
          </div>

          <div className="control-group">
            <label>
              Daily Demand: {dailyDemand}
            </label>

            <input
              type="range"
              min="100"
              max="2000"
              value={dailyDemand}
              onChange={(e) =>
                setDailyDemand(
                  Number(e.target.value)
                )
              }
            />
          </div>

          <div className="control-group">
            <label>
              Warehouse Capacity: {warehouseCapacity}
            </label>

            <input
              type="range"
              min="50"
              max="500"
              value={warehouseCapacity}
              onChange={(e) =>
                setWarehouseCapacity(
                  Number(e.target.value)
                )
              }
            />
          </div>
        </div>

        {/* RECOMMENDATION */}
        <div className="recommendation-card">
          <h2>Optimal Recommendation</h2>

          {optimal ? (
            <div className="recommendation-details">

              <div>
                <span>Required Warehouses</span>
                <strong>
                  {requiredWarehouses}
                </strong>
              </div>

              <div>
                <span>Recommended Warehouses</span>
                <strong>
                  {optimal.k}
                </strong>
              </div>

              <div>
                <span>Minimum Delivery Cost</span>
                <strong>
                  ₹{optimal.cost.toFixed(0)}
                </strong>
              </div>

              <div>
                <span>Total Daily Demand</span>
                <strong>
                  {adjustedDemand.toFixed(0)} units
                </strong>
              </div>

              <div>
                <span>Total Available Capacity</span>
                <strong>
                  {(
                    optimal.k *
                    warehouseCapacity
                  ).toFixed(0)} units
                </strong>
              </div>

              <div>
                <span>Unused Capacity</span>
                <strong>
                  {(
                    optimal.k *
                      warehouseCapacity -
                    adjustedDemand
                  ).toFixed(0)} units
                </strong>
              </div>

            </div>
          ) : (
            <div>
              <span>Required Warehouses</span>

              <strong>
                {requiredWarehouses}
              </strong>

              <p>
                More warehouse options are needed
                for this demand.
              </p>
            </div>
          )}
        </div>
        {/* AI INSIGHTS */}
<div className="ai-insights-card">
  <h2>🤖 AI Insights</h2>
  <button
  className="ai-generate-btn"
  onClick={generateAIInsights}
  disabled={aiLoading}
>
  {aiLoading ? "🤖 Generating..." : "✨ Generate AI Insights"}
</button>

{aiInsight && (
  <div className="ai-generated-insight">
    <strong>🤖 Gemini Analysis</strong>
    <p>{aiInsight}</p>
  </div>
)}

  <div className="ai-insight">
    <strong>📦 Warehouse Recommendation</strong>
    <p>
      Based on the current demand of{" "}
      <strong>{adjustedDemand.toFixed(0)} units</strong>, GridPoint
      recommends{" "}
      <strong>{optimal?.k ?? requiredWarehouses} warehouses</strong>{" "}
      to meet demand efficiently.
    </p>
  </div>

  <div className="ai-insight">
    <strong>💰 Cost Insight</strong>
    <p>
      The estimated minimum delivery cost is{" "}
      <strong>
        ₹{optimal ? optimal.cost.toFixed(0) : "0"}
      </strong>.
      Adding more warehouses beyond the recommended level may increase
      the overall operating cost.
    </p>
  </div>

  <div className="ai-insight">
    <strong>⚡ Capacity Insight</strong>
    <p>
      The recommended configuration provides{" "}
      <strong>
        {optimal
          ? (
              optimal.k * warehouseCapacity - adjustedDemand
            ).toFixed(0)
          : "0"}{" "}
        units
      </strong>{" "}
      of available capacity as a safety buffer.
    </p>
  </div>

  <div className="ai-insight">
    <strong>📈 Demand Insight</strong>
    <p>
      Current demand growth is{" "}
      <strong>{demandGrowth}%</strong>. As demand increases,
      GridPoint automatically recalculates the required warehouses
      and recommended configuration.
    </p>
  </div>
</div>

        {/* CHART */}
<div className="chart-card">
  <div className="chart-header">
    <div>
      <h2>📊 Cost Optimization Analysis</h2>
      <p>
        Compare estimated delivery costs across different warehouse
        configurations.
      </p>
    </div>

    {optimal && (
      <div className="chart-recommendation">
        <span>Recommended</span>
        <strong>{optimal.k} Warehouses</strong>
      </div>
    )}
  </div>

  <div className="chart-wrapper">
    <ResponsiveContainer width="100%" height={380}>
      <LineChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 20,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
        />

        <XAxis
          dataKey="k"
          tickLine={false}
          axisLine={false}
          label={{
            value: "Number of Warehouses",
            position: "insideBottom",
            offset: -5,
          }}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          label={{
            value: "Delivery Cost",
            angle: -90,
            position: "insideLeft",
          }}
        />

        <Tooltip
          cursor={{ strokeDasharray: "4 4" }}
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe5ff",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
          }}
          formatter={(value) => [
            `₹${Number(value).toFixed(0)}`,
            "Delivery Cost",
          ]}
          labelFormatter={(label) =>
            `${label} Warehouse${Number(label) > 1 ? "s" : ""}`
          }
        />

        <Line
          type="monotone"
          dataKey="cost"
          stroke="#2563eb"
          strokeWidth={3}
          dot={{
            r: 4,
            strokeWidth: 2,
          }}
          activeDot={{
            r: 7,
          }}
        />

        {optimal && (
          <ReferenceLine
            x={optimal.k}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="6 5"
            label={{
              value: `Recommended: ${optimal.k}`,
              position: "insideTop",
              fill: "#ef4444",
              fontSize: 13,
            }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  </div>

  <div className="chart-footer">
    <span>
      🔵 Estimated delivery cost
    </span>

    <span>
      🔴 Recommended warehouse configuration
    </span>
  </div>
</div>

      </div>
    </div>
  );
}

export default CostChart;