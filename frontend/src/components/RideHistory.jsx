import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Clock, MapPin, DollarSign, Star, User, TrendingUp } from 'lucide-react';

export default function RideHistory() {
  const { stats, addLog } = useApp();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'rating' | 'fare'

  useEffect(() => {
    fetchRideHistory();
    const interval = setInterval(fetchRideHistory, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchRideHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rides');
      const data = await res.json();
      
      // Filter and sort completed rides
      let filtered = data.filter(r => r.status === 'completed' || r.status === 'cancelled');
      
      if (sortBy === 'recent') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (sortBy === 'rating') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortBy === 'fare') {
        filtered.sort((a, b) => b.fare - a.fare);
      }
      
      setRides(filtered.slice(0, 15));
    } catch (err) {
      console.error('Error fetching ride history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    if (!rating) return 'var(--text-muted)';
    if (rating >= 4.5) return 'var(--color-green)';
    if (rating >= 3.5) return 'var(--color-cyan)';
    return 'var(--color-pink)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>Recent Trips</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Last {rides.length} completed or cancelled rides
          </p>
        </div>
        
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid var(--border-light)',
            borderRadius: '6px',
            color: 'var(--text-main)',
            padding: '6px 10px',
            fontSize: '0.8rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="recent">Most Recent</option>
          <option value="rating">Highest Rated</option>
          <option value="fare">Highest Fare</option>
        </select>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            Loading trip history...
          </div>
        ) : rides.length > 0 ? (
          rides.map((ride, idx) => (
            <div 
              key={ride.id}
              style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-light)',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.85rem',
                hover: 'background 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0,242,254,0.1)',
                  border: '1px solid rgba(0,242,254,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--color-cyan)',
                  flexShrink: 0
                }}>
                  {idx + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <MapPin size={12} style={{ color: 'var(--color-cyan)' }} />
                    <span style={{ color: 'var(--text-main)' }}>{ride.pickup_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <span>→</span>
                    <span>{ride.dropoff_name}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'right' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-cyan)' }}>
                    ${ride.fare.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {ride.distance_km} km
                  </div>
                </div>

                {ride.rating ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: getRatingColor(ride.rating),
                    fontWeight: 600
                  }}>
                    <Star size={12} fill="currentColor" />
                    <span>{ride.rating}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    No rating
                  </div>
                )}

                <div style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: ride.status === 'completed' ? 'rgba(0,242,161,0.1)' : 'rgba(255,8,68,0.1)',
                  color: ride.status === 'completed' ? 'var(--color-green)' : 'var(--color-pink)'
                }}>
                  {ride.status}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No trip history yet. Request a ride to get started!
          </div>
        )}
      </div>
    </div>
  );
}
