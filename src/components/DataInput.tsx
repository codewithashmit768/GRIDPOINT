import React, { useState } from 'react';
import type { Neighborhood } from '../data/sampleNeighborhoods';

interface DataInputProps {
  neighborhoods: Neighborhood[];
  onAddNeighborhood: (item: Neighborhood) => void;
  onSetNeighborhoods: (items: Neighborhood[]) => void;
  onResetDefault: () => void;
}

export const DataInput: React.FC<DataInputProps> = ({
  neighborhoods,
  onAddNeighborhood,
  onSetNeighborhoods,
  onResetDefault,
}) => {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [orders, setOrders] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedOrders = parseInt(orders, 10);

    if (!name.trim()) {
      setErrorMessage('Please enter a valid neighborhood name.');
      return;
    }
    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setErrorMessage('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setErrorMessage('Longitude must be a valid number between -180 and 180.');
      return;
    }
    if (isNaN(parsedOrders) || parsedOrders <= 0) {
      setErrorMessage('Orders must be a positive integer.');
      return;
    }

    const newEntry: Neighborhood = {
      id: `n-${Date.now()}`,
      name: name.trim(),
      lat: parsedLat,
      lng: parsedLng,
      orders: parsedOrders,
    };

    onAddNeighborhood(newEntry);

    // Reset inputs
    setName('');
    setLat('');
    setLng('');
    setOrders('');
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length <= 1) {
        setErrorMessage('Uploaded CSV is empty or missing data rows.');
        return;
      }

      // Expected format: name,lat,lng,orders (with or without header)
      const parsedList: Neighborhood[] = [];
      const startIndex = lines[0].toLowerCase().includes('lat') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length < 4) continue;

        const rowName = parts[0];
        const rowLat = parseFloat(parts[1]);
        const rowLng = parseFloat(parts[2]);
        const rowOrders = parseInt(parts[3], 10);

        if (rowName && !isNaN(rowLat) && !isNaN(rowLng) && !isNaN(rowOrders)) {
          parsedList.push({
            id: `csv-${Date.now()}-${i}`,
            name: rowName,
            lat: rowLat,
            lng: rowLng,
            orders: rowOrders,
          });
        }
      }

      if (parsedList.length === 0) {
        setErrorMessage('No valid rows found. Ensure format is: name,lat,lng,orders');
        return;
      }

      onSetNeighborhoods(parsedList);
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-md">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold tracking-wide text-indigo-400">
          Neighborhood Dataset
        </h2>
        <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-mono">
          {neighborhoods.length} loaded
        </span>
      </div>

      {errorMessage && (
        <div className="mb-4 p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Manual Input Form */}
      <form onSubmit={handleManualAdd} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Name (e.g. HSR)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
          />
          <input
            type="number"
            placeholder="Daily Orders"
            value={orders}
            onChange={(e) => setOrders(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            placeholder="Latitude (e.g. 12.93)"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude (e.g. 77.62)"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-sm transition shadow-sm"
        >
          Add Neighborhood
        </button>
      </form>

      {/* CSV & Reset Actions */}
      <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
        <label className="cursor-pointer border border-dashed border-slate-700 hover:border-indigo-400 px-3 py-1.5 rounded text-slate-300 text-center transition flex-1">
          Upload CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={onResetDefault}
          className="px-3 py-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          Reset Default
        </button>
      </div>
    </div>
  );
};