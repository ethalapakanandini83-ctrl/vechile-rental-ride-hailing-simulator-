import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { MapPin, Navigation, Compass, CheckCircle2, User, Award } from 'lucide-react';
import { generateRoutePolyline } from '../utils/mockGeocoding.js';

export default function PanelDriver() {
  const { 
    availableJobs, 
    socket, 
    addLog,
    fetchAvailableJobs 
  } = useApp();

  const [activeJob, setActiveJob] = useState(null);
  const [jobStatus, setJobStatus] = useState(''); // 'accepted' | 'pickup_arrived' | 'trip_started' | 'completed'
  const [earnings, setEarnings] = useState(0);

  const driveIntervalRef = useRef(null);

  // Poll for new pending jobs if driver is idle
  useEffect(() => {
    let poll;
    if (!activeJob) {
      fetchAvailableJobs();
      poll = setInterval(fetchAvailableJobs, 4000);
    }
    return () => clearInterval(poll);
  }, [activeJob]);

  // Clean up drive interval on unmount
  useEffect(() => {
    return () => {
      if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
    };
  }, []);

  const handleAcceptJob = (job) => {
    setActiveJob(job);
    setJobStatus('accepted');
    
    // Set initial driver position (about 400m away from pickup)
    const driverStartLat = job.pickup_lat + 0.003;
    const driverStartLng = job.pickup_lng - 0.003;

    // Join room for this ride
    socket.emit('join_ride_room', job.id);

    // Accept ride in backend
    socket.emit('human_driver_accept', {
      rideId: job.id,
      driverName: 'You (Driver)',
      driverLat: driverStartLat,
      driverLng: driverStartLng
    });

    addLog(`Accepted ride request ${job.id}. Navigating to pickup...`, 'success');
  };

  // Simulate driving along a route
  const simulateDriverDrive = (startCoords, endCoords, nextStatus, onComplete) => {
    if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
    
    addLog('Starting navigation...', 'info');

    // Generate path points
    const path = generateRoutePolyline(startCoords, endCoords, 12);
    let step = 0;

    driveIntervalRef.current = setInterval(() => {
      if (step < path.length) {
        const [lat, lng] = path[step];
        const eta = Math.ceil((path.length - step) * 0.5);
        
        // Emit GPS updates to server
        socket.emit('human_driver_gps', {
          rideId: activeJob.id,
          lat,
          lng,
          eta_mins: eta
        });

        step++;
      } else {
        clearInterval(driveIntervalRef.current);
        driveIntervalRef.current = null;
        
        // Transition status
        socket.emit('human_driver_status', {
          rideId: activeJob.id,
          status: nextStatus
        });
        
        setJobStatus(nextStatus);
        if (onComplete) onComplete();
      }
    }, 1000);
  };

  // 1. Action: Drive to pickup
  const handleDriveToPickup = () => {
    const start = { lat: activeJob.pickup_lat + 0.003, lng: activeJob.pickup_lng - 0.003 };
    const end = { lat: activeJob.pickup_lat, lng: activeJob.pickup_lng };
    
    simulateDriverDrive(start, end, 'en_route', () => {
      addLog('Arrived at pickup location. Passenger boarding...', 'success');
    });
  };

  // 2. Action: Start trip (drive to destination)
  const handleStartTrip = () => {
    socket.emit('human_driver_status', {
      rideId: activeJob.id,
      status: 'in_progress'
    });
    setJobStatus('in_progress');
    addLog('Trip started. Navigating to destination...', 'success');

    const start = { lat: activeJob.pickup_lat, lng: activeJob.pickup_lng };
    const end = { lat: activeJob.dropoff_lat, lng: activeJob.dropoff_lng };
    
    simulateDriverDrive(start, end, 'completed', () => {
      addLog(`Arrived at destination. Trip completed! Earned $${activeJob.fare.toFixed(2)}`, 'success');
      setEarnings(prev => prev + activeJob.fare);
    });
  };

  // 3. Action: Complete job
  const handleFinishJob = () => {
    setActiveJob(null);
    setJobStatus('');
  };

  // 1. Rendering Active Job HUD
  if (activeJob) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.2rem' }}>Active Job HUD</h3>
          <span className="status-badge" style={{ background: 'rgba(155, 81, 224, 0.15)', color: 'var(--color-purple)', border: '1px solid rgba(155, 81, 224, 0.3)' }}>
            {jobStatus.replace('_', ' ')}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Passenger:</span>
            <span><strong>Anonymous Rider</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Payout:</span>
            <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>${activeJob.fare.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Distance:</span>
            <span><strong>{activeJob.distance_km} km</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <MapPin size={16} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />
            <span>Pickup: <strong>{activeJob.pickup_name}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Navigation size={16} style={{ color: 'var(--color-pink)', flexShrink: 0 }} />
            <span>Dropoff: <strong>{activeJob.dropoff_name}</strong></span>
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          {jobStatus === 'accepted' && (
            <button className="btn-primary" onClick={handleDriveToPickup}>
              <Compass size={18} /> Navigate to Pickup
            </button>
          )}

          {jobStatus === 'en_route' && (
            <button className="btn-primary" onClick={handleStartTrip}>
              <Play size={18} /> Passenger Boarded • Start Trip
            </button>
          )}

          {jobStatus === 'in_progress' && (
            <button className="btn-primary" disabled style={{ opacity: 0.7 }}>
              <Compass className="brand-icon" style={{ animation: 'spin 2s linear infinite' }} size={18} /> Driving...
            </button>
          )}

          {jobStatus === 'completed' && (
            <button className="btn-primary" onClick={handleFinishJob}>
              <CheckCircle2 size={18} /> Finish Job
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Rendering Jobs Queue Listing UI
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '4px' }}>Jobs Console</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Accept passenger hails in San Francisco.
          </p>
        </div>
        
        {/* Earnings tracker */}
        <div className="glass-panel" style={{ padding: '8px 14px', textAlign: 'right', background: 'rgba(0, 242, 161, 0.05)', borderColor: 'rgba(0,242,161,0.1)' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Earnings</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-green)' }}>
            ${earnings.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="driver-jobs-list">
        {availableJobs.length > 0 ? (
          availableJobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Ride Request • {job.vehicle_type}
                </span>
                <span className="job-fare">${job.fare.toFixed(2)}</span>
              </div>

              {/* Locations */}
              <div className="job-locations">
                <div className="job-node">{job.pickup_name}</div>
                <div className="job-node dropoff">{job.dropoff_name}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Distance: {job.distance_km} km</span>
                <button 
                  className="btn-primary"
                  style={{ width: 'auto', height: '36px', padding: '0 16px', borderRadius: '8px', fontSize: '0.8rem' }}
                  onClick={() => handleAcceptJob(job)}
                >
                  Accept Job
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Waiting for incoming passenger ride requests...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
