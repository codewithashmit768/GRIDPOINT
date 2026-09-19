import React from 'react';
import { Circle, MapContainer, Marker, Popup, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Neighborhood, OptimizationResult } from '../types';
import type { ViewMode } from './BeforeAfterToggle.tsx';
import { BeforeAfterToggle } from './BeforeAfterToggle.tsx';

const CLUSTER_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706',
  '#9333ea', '#0891b2', '#e11d48', '#4b5563',
];

const ORIGINAL_COLOR = '#64748b';

interface Props {
  neighborhoods: Neighborhood[];
  result: OptimizationResult | null;
  maxRadiusKm: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  originalCost: number;
  currentOptimizedCost: number | null;
}

const warehouseIcon = new L.DivIcon({
  className: 'custom-warehouse-icon',
  html: `<div style="background-color: #0f172a; width: 22px; height: 22px; border: 3px solid #f8fafc; border-radius: 4px; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [22, 22],
});

const originalWarehouseIcon = new L.DivIcon({
  className: 'custom-warehouse-icon',
  html: `<div style="background-color: #475569; width: 22px; height: 22px; border: 3px solid #e2e8f0; border-radius: 4px; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [22, 22],
});

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function orderWeightedCentroid(neighborhoods: Neighborhood[]): { lat: number; lng: number } | null {
  if (neighborhoods.length === 0) return null;
  let totalOrders = 0;
  let lat = 0;
  let lng = 0;
  for (const n of neighborhoods) {
    totalOrders += n.orders;
    lat += n.lat * n.orders;
    lng += n.lng * n.orders;
  }
  if (totalOrders <= 0) {
    return {
      lat: neighborhoods.reduce((sum, n) => sum + n.lat, 0) / neighborhoods.length,
      lng: neighborhoods.reduce((sum, n) => sum + n.lng, 0) / neighborhoods.length,
    };
  }
  return { lat: lat / totalOrders, lng: lng / totalOrders };
}

function markerSizePx(orders: number, maxOrders: number): number {
  const t = maxOrders <= 0 ? 0 : orders / maxOrders;
  return Math.round(8 + t * 10);
}

function neighborhoodIcon(color: string, size: number): L.DivIcon {
  return new L.DivIcon({
    className: 'custom-node-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.35);"></div>`,
    iconSize: [size, size],
  });
}

export const MapView: React.FC<Props> = ({
  neighborhoods,
  result,
  maxRadiusKm,
  viewMode,
  setViewMode,
  originalCost,
  currentOptimizedCost,
}) => {
  const centerLat = neighborhoods.length ? neighborhoods[0].lat : 12.9716;
  const centerLng = neighborhoods.length ? neighborhoods[0].lng : 77.5946;
  const nodeMap = new Map(neighborhoods.map((n) => [n.id, n]));
  const maxOrders = Math.max(0, ...neighborhoods.map((n) => n.orders));
  const originalCenter = orderWeightedCentroid(neighborhoods);
  const showOriginal = viewMode === 'original';

  const badgeLabel = showOriginal
    ? `Original Cost: ${formatUsd(originalCost)}`
    : currentOptimizedCost != null
      ? `Optimized Cost: ${formatUsd(currentOptimizedCost)}`
      : null;

  return (
    <div className="relative" style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      {badgeLabel && (
        <div className="pointer-events-none absolute top-3 left-3 z-[1000] rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 font-mono text-xs text-slate-100 shadow-lg backdrop-blur-sm">
          {badgeLabel}
        </div>
      )}
      <div className="absolute top-3 right-3 z-[1100] hidden md:block">
        <BeforeAfterToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={11}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showOriginal && originalCenter && (
          <>
            <Marker position={[originalCenter.lat, originalCenter.lng]} icon={originalWarehouseIcon}>
              <Popup>
                <strong>Central warehouse</strong>
                <br />
                Order-weighted centroid of all neighborhoods
              </Popup>
            </Marker>
            {neighborhoods.map((node) => (
              <Polyline
                key={`orig-line-${node.id}`}
                positions={[
                  [originalCenter.lat, originalCenter.lng],
                  [node.lat, node.lng],
                ]}
                pathOptions={{ color: ORIGINAL_COLOR, weight: 1.5, opacity: 0.4 }}
              />
            ))}
          </>
        )}

        {!showOriginal &&
          result?.warehouses.map((wh, idx) => {
            const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
            return (
              <React.Fragment key={wh.id}>
                <Marker position={[wh.lat, wh.lng]} icon={warehouseIcon}>
                  <Popup>
                    <strong>{wh.id.toUpperCase()}</strong>
                    <br />Assigned Nodes: {wh.assignedNeighborhoodIds.length}
                    <br />Capacity: {wh.capacity}
                  </Popup>
                </Marker>
                <Circle
                  center={[wh.lat, wh.lng]}
                  radius={maxRadiusKm * 1000}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 1, dashArray: '4' }}
                />
              </React.Fragment>
            );
          })}

        {neighborhoods.map((node) => {
          if (showOriginal) {
            const size = markerSizePx(node.orders, maxOrders);
            return (
              <Marker
                key={node.id}
                position={[node.lat, node.lng]}
                icon={neighborhoodIcon(ORIGINAL_COLOR, size)}
              >
                <Popup>
                  <strong>{node.name}</strong>
                  <br />Demand: {node.orders} orders
                </Popup>
              </Marker>
            );
          }

          const isUnserved = result?.unservedNeighborhoodIds.includes(node.id);
          let assignedColor = '#64748b';
          if (result) {
            const whIdx = result.warehouses.findIndex((w) =>
              w.assignedNeighborhoodIds.includes(node.id),
            );
            if (whIdx !== -1) {
              assignedColor = CLUSTER_COLORS[whIdx % CLUSTER_COLORS.length];
            }
          }

          return (
            <Marker
              key={node.id}
              position={[node.lat, node.lng]}
              icon={neighborhoodIcon(isUnserved ? '#e11d48' : assignedColor, 14)}
            >
              <Popup>
                <strong>{node.name}</strong>
                <br />Demand: {node.orders} orders
                {isUnserved && (
                  <span style={{ color: '#e11d48', fontWeight: 'bold' }}>
                    <br />Unserved: Exceeds Radius
                  </span>
                )}
              </Popup>
            </Marker>
          );
        })}

        {!showOriginal &&
          result?.warehouses.map((wh, idx) => {
            const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
            return wh.assignedNeighborhoodIds.map((nId) => {
              const node = nodeMap.get(nId);
              if (!node) return null;
              return (
                <Polyline
                  key={`line-${wh.id}-${node.id}`}
                  positions={[
                    [wh.lat, wh.lng],
                    [node.lat, node.lng],
                  ]}
                  pathOptions={{ color, weight: 2, opacity: 0.4 }}
                />
              );
            });
          })}
      </MapContainer>
    </div>
  );
};
