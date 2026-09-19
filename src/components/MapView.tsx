import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Neighborhood, OptimizationResult } from '../types';

const CLUSTER_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706',
  '#9333ea', '#0891b2', '#e11d48', '#4b5563',
];

interface Props {
  neighborhoods: Neighborhood[];
  result: OptimizationResult | null;
  maxRadiusKm: number;
}

const warehouseIcon = new L.DivIcon({
  className: 'custom-warehouse-icon',
  html: `<div style="background-color: #0f172a; width: 22px; height: 22px; border: 3px solid #f8fafc; border-radius: 4px; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [22, 22],
});

export const MapView: React.FC<Props> = ({ neighborhoods, result, maxRadiusKm }) => {
  const centerLat = neighborhoods.length ? neighborhoods[0].lat : 12.9716;
  const centerLng = neighborhoods.length ? neighborhoods[0].lng : 77.5946;
  const nodeMap = new Map(neighborhoods.map((n) => [n.id, n]));

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px' }}>
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

        {/* Warehouses + Service Radius */}
        {result?.warehouses.map((wh, idx) => {
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

        {/* Neighborhood Markers */}
        {neighborhoods.map((node) => {
          const isUnserved = result?.unservedNeighborhoodIds.includes(node.id);
          let assignedColor = '#64748b';

          if (result) {
            const whIdx = result.warehouses.findIndex((w) =>
              w.assignedNeighborhoodIds.includes(node.id)
            );
            if (whIdx !== -1) {
              assignedColor = CLUSTER_COLORS[whIdx % CLUSTER_COLORS.length];
            }
          }

          const nodeIcon = new L.DivIcon({
            className: 'custom-node-icon',
            html: `<div style="background-color: ${isUnserved ? '#e11d48' : assignedColor}; width: 14px; height: 14px; border: 2px solid #ffffff; border-radius: 50%;"></div>`,
            iconSize: [14, 14],
          });

          return (
            <Marker key={node.id} position={[node.lat, node.lng]} icon={nodeIcon}>
              <Popup>
                <strong>{node.name}</strong>
                <br />Demand: {node.orders} orders
                {isUnserved && <span style={{ color: '#e11d48', fontWeight: 'bold' }}><br />Unserved: Exceeds Radius</span>}
              </Popup>
            </Marker>
          );
        })}

        {/* Connecting Lines */}
        {result?.warehouses.map((wh, idx) => {
          const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
          return wh.assignedNeighborhoodIds.map((nId) => {
            const node = nodeMap.get(nId);
            if (!node) return null;
            return (
              <Polyline
                key={`line-${wh.id}-${node.id}`}
                positions={[[wh.lat, wh.lng], [node.lat, node.lng]]}
                pathOptions={{ color, weight: 2, opacity: 0.6 }}
              />
            );
          });
        })}
      </MapContainer>
    </div>
  );
};