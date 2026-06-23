import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { synth } from '../utils/audioSynth.js';

const AppContext = createContext();

const SOCKET_URL = 'http://localhost:5000';

export function AppProvider({ children }) {
  const [userRole, setUserRole] = useState('passenger'); // 'passenger' | 'driver' | 'admin'
  const [vehicles, setVehicles] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [activeRental, setActiveRental] = useState(null);
  const [rentalVehicle, setRentalVehicle] = useState(null);
  const [driverGPS, setDriverGPS] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [socket, setSocket] = useState(null);

  // Helper to add logs to console UI
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ text: `[${timestamp}] ${message}`, type }, ...prev.slice(0, 49)]);
  };

  // 1. Setup Socket.io connection and listeners
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    addLog('Connecting to WebSocket server...', 'system');

    newSocket.on('connect', () => {
    addLog(`WebSocket connection established: ${newSocket.id}`, 'success');
      
      // If driver, register to pool
      if (userRole === 'driver') {
        newSocket.emit('driver_join_pool');
      }
    });

    newSocket.on('ride_status_update', (ride) => {
      setActiveRide(ride);
      addLog(`Ride status updated: ${ride.status.toUpperCase()}`, 'success');
      synth.playNotification();

      if (ride.status === 'completed') {
        setDriverGPS(null);
        addLog(`Trip completed. Please rate your driver!`, 'success');
        fetchVehicles();
        fetchStats();
      }
    });

    newSocket.on('driver_gps_update', (gpsData) => {
      setDriverGPS({ lat: gpsData.lat, lng: gpsData.lng, eta_mins: gpsData.eta_mins });
    });

    newSocket.on('ride_taken', (rideId) => {
      setAvailableJobs(prev => prev.filter(j => j.id !== rideId));
    });

    newSocket.on('disconnect', () => {
      addLog('WebSocket disconnected', 'warning');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Sync driver pool registration on role change
  useEffect(() => {
    if (socket && socket.connected) {
      if (userRole === 'driver') {
        socket.emit('driver_join_pool');
        addLog('Registered driver to matching pool', 'info');
      }
    }
  }, [userRole, socket]);

  // Fetch initial fleet and logs
  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      setVehicles(data);
      
      // If we have an active rental, sync details
      if (activeRental) {
        const current = data.find(v => v.id === activeRental.vehicle_id);
        if (current) setRentalVehicle(current);
      }
    } catch (err) {
      console.error('Error fetching fleet vehicles:', err);
    }
  };

  // Fetch Admin Stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Sync available driver jobs in DB
  const fetchAvailableJobs = async () => {
    try {
      const res = await fetch('/api/rides');
      const data = await res.json();
      const pendingJobs = data.filter(r => r.status === 'pending');
      setAvailableJobs(pendingJobs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchStats();
    if (userRole === 'driver') {
      fetchAvailableJobs();
    }
  }, [userRole]);

  // Core Booking API wrapper
  const bookRide = async (pickup, dropoff, fare, distanceKm, vehicleType) => {
    const id = 'ride_' + Math.random().toString(36).substr(2, 9);
    const body = {
      id,
      pickupName: pickup.name,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffName: dropoff.name,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      fare,
      distanceKm,
      vehicleType
    };

    try {
      addLog(`Initiating ride booking request for ${vehicleType}...`, 'info');
      const res = await fetch('/api/ride/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const newRide = await res.json();
      setActiveRide(newRide);
      
      // Notify WebSocket server to start simulated driver logic
      socket.emit('join_ride_room', id);
      socket.emit('request_ride', {
        id,
        pickup: { lat: pickup.lat, lng: pickup.lng },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng }
      });

      addLog(`Ride requested successfully. Searching for nearby drivers...`, 'info');
      return newRide;
    } catch (err) {
      addLog('Failed to book ride', 'warning');
      console.error(err);
    }
  };

  // Cancel active ride
  const cancelRide = async () => {
    if (!activeRide) return;
    try {
      addLog('Cancelling ride request...', 'warning');
      await fetch(`/api/ride/${activeRide.id}/cancel`, { method: 'POST' });
      socket.emit('cancel_ride_simulation', activeRide.id);
      setActiveRide(null);
      setDriverGPS(null);
      addLog('Ride cancelled by user.', 'warning');
      fetchVehicles();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Driver Rating
  const submitReview = async (rating, comment) => {
    if (!activeRide) return;
    try {
      await fetch(`/api/ride/${activeRide.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      });
      addLog(`Submitted driver rating: ${rating} Stars. Thank you!`, 'success');
      setActiveRide(null);
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Mark current ride as completed manually
  const completeRide = async () => {
    if (!activeRide) return;
    try {
      addLog('Completing ride manually...', 'info');
      const res = await fetch(`/api/ride/${activeRide.id}/complete`, {
        method: 'POST'
      });
      const updated = await res.json();
      setActiveRide(updated);
      addLog('Ride marked completed. Please leave a review.', 'success');
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Rent Vehicle
  const rentVehicle = async (vehicleId, hours) => {
    const id = 'rent_' + Math.random().toString(36).substr(2, 9);
    try {
      addLog(`Reserving vehicle ID ${vehicleId} for ${hours} hours...`, 'info');
      const res = await fetch('/api/rental/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, vehicleId, durationHours: hours })
      });
      const data = await res.json();
      
      if (res.ok) {
        setActiveRental(data.rental);
        setRentalVehicle(data.vehicle);
        addLog(`Confirming rental: ${data.vehicle.name}. Keycard active!`, 'success');
        fetchVehicles();
        fetchStats();
      } else {
        addLog(`Rental failed: ${data.error}`, 'warning');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Return Rental Vehicle
  const returnVehicle = async () => {
    if (!activeRental) return;
    try {
      addLog(`Returning rental vehicle ${rentalVehicle.name}...`, 'info');
      await fetch(`/api/rental/${activeRental.id}/return`, { method: 'POST' });
      
      synth.playLock();
      synth.playEngineStop();
      
      addLog(`Vehicle returned successfully. Gate locked.`, 'success');
      setActiveRental(null);
      setRentalVehicle(null);
      fetchVehicles();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Virtual Keyfob buttons trigger
  const sendKeyfobControl = async (action) => {
    if (!activeRental) return;
    
    // Play synth audio feedback locally
    if (action === 'unlock') {
      synth.playUnlock();
      addLog('FOB Command sent: UNLOCK', 'success');
    } else if (action === 'lock') {
      synth.playLock();
      synth.playEngineStop();
      addLog('FOB Command sent: LOCK & ENGINE STOP', 'warning');
    } else if (action === 'honk') {
      synth.playHonk();
      addLog('FOB Command sent: HONK HORN', 'info');
    } else if (action === 'start') {
      synth.playEngineStart();
      addLog('FOB Command sent: IGNITE ENGINE', 'success');
    } else if (action === 'stop') {
      synth.playEngineStop();
      addLog('FOB Command sent: SHUT DOWN ENGINE', 'warning');
    }

    try {
      const res = await fetch(`/api/rental/${activeRental.id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const updated = await res.json();
      setActiveRental(updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Reset & Reseed Database
  const resetDatabase = async () => {
    try {
      addLog('Requesting database hard reset...', 'warning');
      const res = await fetch('/api/reset-db', { method: 'POST' });
      const data = await res.json();
      
      // Clear all active contexts
      setActiveRide(null);
      setActiveRental(null);
      setRentalVehicle(null);
      setDriverGPS(null);
      
      addLog(data.message, 'success');
      fetchVehicles();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppContext.Provider value={{
      userRole,
      setUserRole,
      vehicles,
      activeRide,
      activeRental,
      rentalVehicle,
      driverGPS,
      logs,
      stats,
      availableJobs,
      socket,
      addLog,
      bookRide,
      cancelRide,
      completeRide,
      submitReview,
      rentVehicle,
      returnVehicle,
      sendKeyfobControl,
      resetDatabase,
      fetchStats,
      fetchVehicles,
      fetchAvailableJobs
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
