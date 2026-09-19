import { Icon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { sampleNeighborhoods } from './data/sampleNeighborhoods.ts';

const BENGALURU: [number, number] = [12.9716, 77.5946];

const TEST_MARKERS = sampleNeighborhoods.filter((n) =>
  ['n1', 'n2', 'n3', 'n7'].includes(n.id),
);

// Vite/webpack break Leaflet's default icon URLs (it looks for images relative
// to the JS bundle). Wipe the autodetected path, then point at bundled assets.
type DefaultIconProto = Icon.Default & { _getIconUrl?: string };
delete (Icon.Default.prototype as DefaultIconProto)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function TestMap() {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-slate-700">
        Leaflet smoke test (throwaway)
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {TEST_MARKERS.map((n) => n.name).join(', ')} — click a marker for
        details.
      </p>
      {/* Tailwind Preflight sets img { max-width: 100% }, which collapses tiles
          and marker icons. Undo that inside the map only. */}
      <div className="mt-2 h-96 w-full overflow-hidden rounded border border-slate-300 [&_img]:max-w-none">
        <MapContainer
          center={BENGALURU}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {TEST_MARKERS.map((n) => (
            <Marker key={n.id} position={[n.lat, n.lng]}>
              <Popup>
                <strong>{n.name}</strong>
                <br />
                {n.orders} orders / day
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
