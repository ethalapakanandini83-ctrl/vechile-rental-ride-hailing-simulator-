import React from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import LeafletMap from './components/LeafletMap.jsx';
import PanelPassenger from './components/PanelPassenger.jsx';
import PanelRental from './components/PanelRental.jsx';
import PanelDriver from './components/PanelDriver.jsx';
import PanelAdmin from './components/PanelAdmin.jsx';
import { Car, Key, UserCheck, Shield, Terminal, Zap } from 'lucide-react';

function DashboardShell() {
  const { userRole, setUserRole, logs } = useApp();

  return (
    <div className="app-container">
      {/* 1. Left Sidebar Cockpit */}
      <div className="sidebar">
        
        {/* Header Branding */}
        <div className="sidebar-header">
          <div className="brand">
            <Zap className="brand-icon" fill="currentColor" size={24} />
            <span>ApexMobility HUD</span>
          </div>
          
          {/* Navigation Role Selector */}
          <div className="role-selector">
            <button 
              className={`role-btn ${userRole === 'passenger' ? 'active' : ''}`}
              onClick={() => setUserRole('passenger')}
              title="Request simulated ride-hailing trips"
            >
              <Car size={16} />
              <span>Ride</span>
            </button>
            
            <button 
              className={`role-btn ${userRole === 'rental' ? 'active' : ''}`}
              onClick={() => setUserRole('rental')}
              title="Autonomous vehicle rentals with keyfob simulation"
            >
              <Key size={16} />
              <span>Rent</span>
            </button>
            
            <button 
              className={`role-btn ${userRole === 'driver' ? 'active' : ''}`}
              onClick={() => setUserRole('driver')}
              title="Driver HUD - Accept & complete orders"
            >
              <UserCheck size={16} />
              <span>Driver</span>
            </button>

            <button 
              className={`role-btn ${userRole === 'admin' ? 'active' : ''}`}
              onClick={() => setUserRole('admin')}
              title="Admin control panel & SQLite viewer"
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Dynamic Panels Content */}
        <div className="sidebar-content">
          {userRole === 'passenger' && <PanelPassenger />}
          {userRole === 'rental' && <PanelRental />}
          {userRole === 'driver' && <PanelDriver />}
          {userRole === 'admin' && <PanelAdmin />}
        </div>

        {/* Console Log Footer */}
        <div style={{
          borderTop: '1px solid var(--border-light)',
          background: 'rgba(5, 6, 12, 0.9)',
          padding: '16px 20px',
          maxHeight: '130px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Terminal size={14} className="brand-icon" />
            <span>Event telemetry logs</span>
          </div>
          <div style={{
            flex: '1',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.72rem',
            lineHeight: '1.4',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {logs.length > 0 ? (
              logs.map((log, index) => {
                let color = 'var(--text-muted)';
                if (log.type === 'success') color = 'var(--color-green)';
                if (log.type === 'warning') color = 'var(--color-pink)';
                if (log.type === 'system') color = 'var(--color-cyan)';
                
                return (
                  <div key={index} style={{ color }}>
                    {log.text}
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Console initialized. Waiting for events...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Right Map Viewport */}
      <LeafletMap />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DashboardShell />
    </AppProvider>
  );
}
