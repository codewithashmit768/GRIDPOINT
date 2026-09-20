# GridPoint

## Smart Warehouse Location Optimization Platform

GridPoint is a warehouse optimization platform designed to help e-commerce
businesses determine suitable warehouse locations and assignments for
different neighborhoods.

## Problem

An e-commerce company serves multiple neighborhoods with different daily
order volumes and geographical locations.

GridPoint helps determine warehouse requirements while minimizing delivery
cost and considering warehouse capacity.

## Key Features

- Daily demand input
- Demand growth simulation
- Warehouse capacity configuration
- Required warehouse calculation
- Recommended warehouse calculation
- Delivery cost estimation
- Unused capacity calculation
- Cost vs number of warehouses visualization
- Recommended warehouse indicator

## Optimization Logic

GridPoint considers:

- Daily customer demand
- Demand growth
- Warehouse capacity
- Number of warehouses
- Delivery cost

The system calculates the minimum number of warehouses required and evaluates
warehouse configurations to identify a suitable recommendation.

## Technology Stack

- React
- TypeScript
- Vite
- Recharts
- CSS

## AI Component

[ADD THE ACTUAL AI COMPONENT USED BY THE TEAM HERE]

## Project Structure

```text
src/
├── components/
│   └── CostChart.tsx
├── App.tsx
├── App.css
└── main.tsx