import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Database, RefreshCw, BarChart2, DollarSign, Activity, Star } from 'lucide-react';
import RideHistory from './RideHistory.jsx';


export default function PanelAdmin() {
  const { 
    stats, 
    resetDatabase, 
    fetchStats 
  } = useApp();

  const [activeTable, setActiveTable] = useState('vehicles'); // 'vehicles' | 'rides' | 'rentals' | 'history'
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch SQLite records for the selected table
  const fetchTableData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${activeTable}`);
      const data = await res.json();
      setTableData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for stats and table data
  useEffect(() => {
    fetchStats();
    fetchTableData();
    const interval = setInterval(() => {
      fetchStats();
      fetchTableData();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTable]);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset and re-seed the SQLite database? This will clear all ride history, rental logs, and reset vehicle coordinates.')) {
      resetDatabase().then(() => {
        fetchTableData();
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '4px' }}>Control Room</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            System-wide analytics & SQLite inspector.
          </p>
        </div>

        <button 
          className="btn-danger" 
          onClick={handleReset}
          style={{ width: 'auto', height: '36px', padding: '0 12px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-pink)' }}
        >
          <RefreshCw size={14} /> Reset DB
        </button>
      </div>

      {/* Analytics Cards */}
      {stats && (
        <div className="admin-metrics">
          <div className="metric-card">
            <span className="metric-title">Total Revenue</span>
            <span className="metric-value green">${stats.totals.totalRevenue.toFixed(2)}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Rides: ${stats.totals.ridesRevenue} | Rentals: ${stats.totals.rentalsRevenue}
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-title">Avg Rating</span>
            <span className="metric-value cyan" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={16} fill="currentColor" />
              {stats.totals.avgRating || 'N/A'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats.totals.completedRides || 0} rides completed
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-title">Ride Bookings</span>
            <span className="metric-value">{stats.totals.rides}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Success: {stats.totals.completedRides} | Cancelled: {stats.totals.cancelledRides}
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-title">Car Rentals</span>
            <span className="metric-value">{stats.totals.rentals}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Fleet utilization
            </span>
          </div>
        </div>
      )}

      {/* SQLite Inspector */}
      <div>
        <div className="admin-section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={16} className="brand-icon" />
            <span>Data Explorer</span>
          </span>

          <select 
            value={activeTable} 
            onChange={(e) => setActiveTable(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              color: 'var(--text-main)',
              padding: '2px 8px',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          >
            <option value="vehicles">vehicles</option>
            <option value="rides">rides</option>
            <option value="rentals">rentals</option>
            <option value="history">Trip History</option>
          </select>
        </div>

        {activeTable === 'history' ? (
          <RideHistory />
        ) : (
          <div className="db-inspector">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Querying SQLite tables...
              </div>
            ) : tableData.length > 0 ? (
              <table className="db-table">
                <thead>
                  <tr>
                    {Object.keys(tableData[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, colIdx) => (
                        <td key={colIdx} title={String(val)}>
                          {val === null || val === undefined ? 'NULL' : String(val).substring(0, 50)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No records found in table `{activeTable}`.
              </div>
            )}
          </div>
        )}
      </div>

      {/* System Status Console */}
      <div style={{ marginTop: '4px' }}>
        <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Server Event Broadcasts
        </h4>
        <div style={{ 
          background: '#07090f', 
          border: '1px solid var(--border-light)', 
          borderRadius: '10px', 
          padding: '12px', 
          fontFamily: 'monospace', 
          fontSize: '0.75rem', 
          color: 'var(--color-green)',
          height: '100px',
          overflowY: 'auto'
        }}>
          <div>[INFO] Server running on Express.js framework</div>
          <div>[DB] SQLite schema verified & validated</div>
          <div>[SOCKET] Matches pool listening for connections</div>
          <div>[SIM] AI matching models active</div>
        </div>
      </div>
    </div>
  );
}
