import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Lock, Unlock, Key, Play, Square, Volume2, ArrowLeftCircle, Battery, RefreshCw, Zap } from 'lucide-react';

export default function PanelRental() {
  const { 
    vehicles, 
    activeRental, 
    rentalVehicle, 
    rentVehicle, 
    returnVehicle, 
    sendKeyfobControl 
  } = useApp();

  const [hours, setHours] = useState(2);

  // Filter out rented vehicles for display
  const availableVehicles = vehicles.filter(v => v.status === 'available');

  // 1. Rendering Virtual Keyfob HUD when a vehicle is active
  if (activeRental && rentalVehicle) {
    const { unlocked, engine_started, duration_hours, total_cost } = activeRental;

    return (
      <div className="keyfob-panel">
        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '1.25rem' }}>Active Rental</h3>
        </div>

        {/* Smartphone Virtual Key Fob */}
        <div className="fob-widget">
          <div className="fob-screen">
            <span className="fob-screen-title">{rentalVehicle.name}</span>
            <span className="fob-screen-status">
              {unlocked ? (
                <>
                  <Unlock size={14} style={{ color: 'var(--color-green)' }} /> 
                  <span style={{ color: 'var(--color-green)' }}>UNLOCKED</span>
                </>
              ) : (
                <>
                  <Lock size={14} style={{ color: 'var(--color-pink)' }} /> 
                  <span style={{ color: 'var(--color-pink)' }}>LOCKED</span>
                </>
              )}
            </span>
          </div>

          <div className="fob-grid">
            {/* Unlock button */}
            <button 
              className={`fob-btn ${unlocked ? 'active' : ''}`}
              onClick={() => sendKeyfobControl('unlock')}
            >
              <Unlock size={24} />
              <span className="fob-btn-label">Unlock</span>
            </button>

            {/* Lock button */}
            <button 
              className={`fob-btn ${!unlocked ? 'active' : ''}`}
              onClick={() => sendKeyfobControl('lock')}
            >
              <Lock size={24} />
              <span className="fob-btn-label">Lock</span>
            </button>

            {/* Engine Start button */}
            <button 
              className={`fob-btn ${engine_started ? 'active' : ''}`}
              onClick={() => sendKeyfobControl('start')}
              disabled={!unlocked}
              style={{ opacity: unlocked ? 1 : 0.4, cursor: unlocked ? 'pointer' : 'not-allowed' }}
            >
              <Play size={24} style={{ color: 'var(--color-green)' }} />
              <span className="fob-btn-label">Start</span>
            </button>

            {/* Engine Stop button */}
            <button 
              className={`fob-btn ${!engine_started ? 'active' : ''}`}
              onClick={() => sendKeyfobControl('stop')}
              disabled={!unlocked}
              style={{ opacity: unlocked ? 1 : 0.4, cursor: unlocked ? 'pointer' : 'not-allowed' }}
            >
              <Square size={24} style={{ color: 'var(--color-pink)' }} />
              <span className="fob-btn-label">Stop</span>
            </button>

            {/* Horn button */}
            <button 
              className="fob-btn"
              onClick={() => sendKeyfobControl('honk')}
              style={{ gridColumn: 'span 2' }}
            >
              <Volume2 size={24} />
              <span className="fob-btn-label">Sound Horn</span>
            </button>
          </div>
        </div>

        {/* Rental Spec & Summary Card */}
        <div className="glass-panel" style={{ width: '100%', padding: '16px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
            <span><strong>{duration_hours} hours</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Cost:</span>
            <span><strong>${total_cost.toFixed(2)}</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-green)' }}>
            <span>Battery Charge:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Battery size={14} />
              <strong>{rentalVehicle.battery}%</strong>
            </span>
          </div>
        </div>

        <button className="btn-primary" onClick={returnVehicle}>
          <ArrowLeftCircle size={18} /> Return Vehicle
        </button>
      </div>
    );
  }

  // 2. Rendering Fleet Catalog Listing UI
  return (
    <div style={{ display: 'flex', flex: '1', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '4px' }}>Rental Catalog</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Select a vehicle from our autonomous fleet and drive keyless.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="form-label" style={{ margin: 0 }}>Rental Duration:</span>
        <select 
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          style={{ 
            background: 'rgba(0,0,0,0.5)', 
            border: '1px solid var(--border-light)', 
            borderRadius: '6px', 
            color: 'var(--text-main)', 
            padding: '4px 8px',
            outline: 'none',
            fontSize: '0.85rem'
          }}
        >
          <option value={1}>1 Hour</option>
          <option value={2}>2 Hours</option>
          <option value={4}>4 Hours</option>
          <option value={8}>8 Hours</option>
          <option value={24}>24 Hours</option>
        </select>
      </div>

      <div className="fleet-grid">
        {availableVehicles.length > 0 ? (
          availableVehicles.map((v) => (
            <div key={v.id} className="vehicle-rental-card">
              <div className="vehicle-rental-header">
                <div>
                  <div className="vehicle-title">{v.name}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Autonomous {v.type.toUpperCase()}
                  </span>
                </div>
                <span className={`vehicle-badge ${v.category}`}>
                  {v.category}
                </span>
              </div>

              {/* Specs */}
              <div className="vehicle-specs">
                <div className="spec-item">
                  <Battery size={14} style={{ color: 'var(--color-green)' }} />
                  <span>Bat: <span className="spec-val">{v.battery}%</span></span>
                </div>
                <div className="spec-item">
                  <Zap size={14} style={{ color: 'var(--color-cyan)' }} />
                  <span>Range: <span className="spec-val">{v.range_km}km</span></span>
                </div>
                <div className="spec-item">
                  <Key size={14} style={{ color: 'var(--color-purple)' }} />
                  <span>Keyless: <span className="spec-val">Yes</span></span>
                </div>
              </div>

              {/* Pricing & Confirm */}
              <div className="rental-pricing">
                <div>
                  <span className="pricing-tag">${v.price_per_hour.toFixed(2)}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> / hour</span>
                </div>

                <button 
                  className="btn-primary" 
                  style={{ width: 'auto', height: '38px', padding: '0 16px', fontSize: '0.85rem', borderRadius: '8px' }}
                  onClick={() => rentVehicle(v.id, hours)}
                >
                  Book (${(v.price_per_hour * hours).toFixed(2)})
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No vehicles available in SF. All rented out or charging.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
