import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext.jsx';
import { generateRoutePolyline } from '../utils/mockGeocoding.js';

// Custom Glowing SVG Icons
const createDivIcon = (htmlContent, className) => {
  return L.divIcon({
    html: htmlContent,
    className: className,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

const PASSENGER_SVG = `
  <div style="
    width: 24px;
    height: 24px;
    background: #00f2fe;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 15px #00f2fe, 0 0 5px #00f2fe;
    animation: marker-pulse 1.8s infinite ease-out;
  "></div>
`;

const DRIVER_SVG = `
  <div style="
    width: 32px;
    height: 32px;
    background: #9b51e0;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 15px #9b51e0, 0 0 5px #9b51e0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/>
      <path d="M9 17h6"/>
      <circle cx="17" cy="17" r="2"/>
    </svg>
  </div>
`;

const VEHICLE_SVG = (type, status) => {
  const color = status === 'rented' ? '#ff0844' : '#00f2a1';
  const icon = type === 'car' ? '🚗' : type === 'bike' ? '🏍️' : '🛵';
  return `
    <div style="
      width: 28px;
      height: 28px;
      background: #0f172a;
      border: 2px solid ${color};
      border-radius: 50%;
      box-shadow: 0 0 12px ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.3s ease;
    ">
      ${icon}
    </div>
  `;
};

export default function LeafletMap() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const routeLayerRef = useRef(null);
  
  const { 
    vehicles, 
    activeRide, 
    activeRental, 
    rentalVehicle, 
    driverGPS 
  } = useApp();

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      // Center on San Francisco
      const map = L.map(mapContainerRef.current, {
        center: [37.7749, -122.4194],
        zoom: 13,
        zoomControl: false
      });

      // Add Zoom Control to Bottom Right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Dark Mode Tile Provider (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Render Fleet Vehicles (for Renting)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old rental markers
    Object.keys(markersRef.current).forEach(key => {
      if (key.startsWith('vehicle_')) {
        map.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

    // We only display fleet markers if NOT in active ride/rental tracking, to keep map clean!
    const showFleet = !activeRide && !activeRental;

    if (showFleet) {
      vehicles.forEach(v => {
        // Skip display if vehicle is rented by another user (but available or in charger show it)
        if (v.status === 'rented') return;

        const marker = L.marker([v.lat, v.lng], {
          icon: createDivIcon(VEHICLE_SVG(v.type, v.status), 'vehicle-marker')
        }).addTo(map);

        // Bind informative popup
        marker.bindPopup(`
          <div style="font-family: 'Space Grotesk', sans-serif; min-width: 140px;">
            <strong style="color: #00f2fe; font-size: 0.95rem;">${v.name}</strong><br/>
            <span style="color: #9ca3af; font-size: 0.8rem;">Type: ${v.type.toUpperCase()} (${v.category})</span><br/>
            <span style="color: #9ca3af; font-size: 0.8rem;">Battery: ${v.battery}% (${v.range_km} km range)</span><br/>
            <span style="color: #00f2a1; font-weight: 700; font-size: 0.9rem;">$${v.price_per_hour.toFixed(2)}/hr</span>
          </div>
        `);

        markersRef.current[`vehicle_${v.id}`] = marker;
      });
    }
  }, [vehicles, activeRide, activeRental]);

  // 3. Render Ride-Hailing Routes & Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up temporary markers
    if (markersRef.current['pickup']) {
      map.removeLayer(markersRef.current['pickup']);
      delete markersRef.current['pickup'];
    }
    if (markersRef.current['dropoff']) {
      map.removeLayer(markersRef.current['dropoff']);
      delete markersRef.current['dropoff'];
    }
    if (markersRef.current['driver']) {
      map.removeLayer(markersRef.current['driver']);
      delete markersRef.current['driver'];
    }
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (activeRide) {
      const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = activeRide;

      // Draw Pickup (Passenger) Marker
      const pickupMarker = L.marker([pickup_lat, pickup_lng], {
        icon: createDivIcon(PASSENGER_SVG, 'pickup-marker')
      }).addTo(map);
      markersRef.current['pickup'] = pickupMarker;

      // Draw Dropoff Marker
      const dropoffMarker = L.marker([dropoff_lat, dropoff_lng], {
        icon: createDivIcon(`
          <div style="
            width: 20px;
            height: 20px;
            background: #ff0844;
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 0 15px #ff0844;
          "></div>
        `, 'dropoff-marker')
      }).addTo(map);
      markersRef.current['dropoff'] = dropoffMarker;

      // Draw Route Polyline (Double Layered Glowing Neon Line)
      const routeCoords = generateRoutePolyline(
        { lat: pickup_lat, lng: pickup_lng },
        { lat: dropoff_lat, lng: dropoff_lng }
      );
      
      const glowLine = L.polyline(routeCoords, {
        color: '#00f2fe',
        weight: 8,
        opacity: 0.2
      });
      const coreLine = L.polyline(routeCoords, {
        color: '#4facfe',
        weight: 3,
        opacity: 0.95
      });

      const routeGroup = L.featureGroup([glowLine, coreLine]).addTo(map);
      routeLayerRef.current = routeGroup;

      // Zoom map to fit route bounds
      map.fitBounds(routeGroup.getBounds(), { padding: [50, 50] });

      // Track and render driver coordinates if active/en route
      if (driverGPS) {
        const driverMarker = L.marker([driverGPS.lat, driverGPS.lng], {
          icon: createDivIcon(DRIVER_SVG, 'driver-marker')
        }).addTo(map);
        markersRef.current['driver'] = driverMarker;
        
        // Pan map slightly to keep driver and destination in focus
        if (status === 'accepted' || status === 'en_route') {
          map.panTo(driverGPS);
        } else if (status === 'in_progress') {
          map.panTo(driverGPS);
        }
      }
    }
  }, [activeRide, driverGPS]);

  // 4. Render Active Rental tracking
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markersRef.current['rental_hud']) {
      map.removeLayer(markersRef.current['rental_hud']);
      delete markersRef.current['rental_hud'];
    }

    if (activeRental && rentalVehicle) {
      // Draw a special glowing marker for our rented vehicle
      const rentalMarker = L.marker([rentalVehicle.lat, rentalVehicle.lng], {
        icon: createDivIcon(VEHICLE_SVG(rentalVehicle.type, 'rented'), 'active-rental-marker')
      }).addTo(map);
      
      markersRef.current['rental_hud'] = rentalMarker;
      
      // Pan and zoom to rented vehicle
      map.setView([rentalVehicle.lat, rentalVehicle.lng], 15);
    }
  }, [activeRental, rentalVehicle]);

  return (
    <div className="map-viewport">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>
      
      {/* Floating HUD overlay when a vehicle is active in rental */}
      {activeRental && rentalVehicle && (
        <div className="fob-floating-hud glass-panel">
          <div className="hud-item">
            <span className="hud-label">Vehicle</span>
            <span className="hud-val" style={{ color: '#00f2fe' }}>{rentalVehicle.name}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Status</span>
            <span className="hud-val uppercase" style={{ color: activeRental.unlocked ? '#00f2a1' : '#ff0844' }}>
              {activeRental.unlocked ? 'Unlocked' : 'Locked'}
            </span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Engine</span>
            <span className="hud-val uppercase" style={{ color: activeRental.engine_started ? '#00f2a1' : '#ff0844' }}>
              {activeRental.engine_started ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Charge</span>
            <span className="hud-val green">{rentalVehicle.battery}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
