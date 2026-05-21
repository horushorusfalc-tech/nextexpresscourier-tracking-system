
import React, { useEffect, useRef } from 'react';
import { useAdmin } from '../AdminContext';
import { ShipmentStatus } from '../../../types';

const cityCoordinates: Record<string, [number, number]> = {
  'London': [51.5074, -0.1278], 'New York': [40.7128, -74.0060], 'Dubai': [25.2048, 55.2708],
  'Sydney': [-33.8688, 151.2093], 'Tokyo': [35.6762, 139.6503], 'Paris': [48.8566, 2.3522],
  'Singapore': [1.3521, 103.8198], 'Berlin': [52.5200, 13.4050]
};

const getCoords = (cityStr: string): [number, number] => {
  const cityKey = Object.keys(cityCoordinates).find(k => cityStr.toLowerCase().includes(k.toLowerCase()));
  if (cityKey) return cityCoordinates[cityKey];
  let hash = 0;
  for (let i = 0; i < cityStr.length; i++) hash = cityStr.charCodeAt(i) + ((hash << 5) - hash);
  const lat = (hash % 60);
  const lng = ((hash * 2) % 180) - 90;
  return [lat, lng];
};

export const PulseView: React.FC = () => {
  const { state } = useAdmin();
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (state.viewMode === 'PULSE' && !state.loading) {
      const timer = setTimeout(() => {
        const mapEl = document.getElementById('pulse-map');
        if (!mapEl) return;
        if (mapInstanceRef.current) mapInstanceRef.current.remove();
        
        const L = (window as any).L;
        if (!L) return;

        const map = L.map('pulse-map', { zoomControl: false, attributionControl: false }).setView([20, 0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
        
        state.shipments.forEach(s => {
          const icon = L.divIcon({ 
            className: 'pulse-icon', 
            html: `<div class="w-3 h-3 ${s.currentStatus === ShipmentStatus.CANCELLED ? 'bg-rose-500' : 'bg-blue-400'} rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>` 
          });
          L.marker(getCoords(s.destination), { icon }).addTo(map).bindPopup(`
            <div class="p-2">
              <p class="text-[9px] font-black uppercase text-slate-400 mb-1">Asset ID</p>
              <p class="text-xs font-black text-white uppercase">${s.trackingNumber}</p>
              <p class="text-[9px] font-bold text-slate-400 mt-2 uppercase">${s.currentStatus}</p>
            </div>
          `);
        });
        mapInstanceRef.current = map;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.viewMode, state.shipments, state.loading]);

  useEffect(() => {
    return () => { 
      if (mapInstanceRef.current) mapInstanceRef.current.remove(); 
    };
  }, []);

  const activeCount = state.shipments.filter(s => s.currentStatus !== ShipmentStatus.DELIVERED && s.currentStatus !== ShipmentStatus.CANCELLED).length;

  return (
    <div className="absolute inset-0 bg-slate-950">
      <div id="pulse-map" className="w-full h-full"></div>
      <div className="absolute top-6 left-6 z-[1000] bg-slate-950/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Global Traffic Pulse</p>
        <p className="text-white text-xs font-medium">Monitoring {activeCount} Active Shipments</p>
      </div>
    </div>
  );
};

