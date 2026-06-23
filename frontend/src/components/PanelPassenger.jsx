import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { searchLocations, getHaversineDistance } from '../utils/mockGeocoding.js';
import { MapPin, Navigation, Star, Clock, User, DollarSign, X } from 'lucide-react';

export default function PanelPassenger() {
  const { 
    bookRide, 
    activeRide, 
    cancelRide, 
    completeRide,
    submitReview, 
    driverGPS 
  } = useApp();

  // Booking details states
  const [pickupText, setPickupText] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  
  const [dropoffText, setDropoffText] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  
  const [fares, setFares] = useState(null);
  const [distance, setDistance] = useState(0);
  const [selectedType, setSelectedType] = useState('Economy');

  // Review states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Handle address searches
  const handlePickupSearch = (val) => {
    setPickupText(val);
    if (val.length >= 2) {
      setPickupSuggestions(searchLocations(val));
    } else {
      setPickupSuggestions([]);
    }
  };

  const handleDropoffSearch = (val) => {
    setDropoffText(val);
    if (val.length >= 2) {
      setDropoffSuggestions(searchLocations(val));
    } else {
      setDropoffSuggestions([]);
    }
  };

  // Select a suggestion POI
  const selectPickup = (loc) => {
    setPickupText(loc.name);
    setPickupCoords({ lat: loc.lat, lng: loc.lng });
    setPickupSuggestions([]);
  };

  const selectDropoff = (loc) => {
    setDropoffText(loc.name);
    setDropoffCoords({ lat: loc.lat, lng: loc.lng });
    setDropoffSuggestions([]);
  };

  // Trigger fare calculations once coordinates are set
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const dist = getHaversineDistance(pickupCoords, dropoffCoords);
      setDistance(dist);
      
      // Call Backend API /api/fare
      fetch('/api/fare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distanceKm: dist })
      })
      .then(res => res.json())
      .then(data => {
        setFares(data.estimations);
      })
      .catch(err => console.error('Error fetching estimated fares:', err));
    } else {
      setFares(null);
      setDistance(0);
    }
  }, [pickupCoords, dropoffCoords]);

  // Request Book Ride
  const handleBook = () => {
    if (!pickupCoords || !dropoffCoords || !fares) return;
    const fare = fares[selectedType];
    bookRide(
      { name: pickupText, lat: pickupCoords.lat, lng: pickupCoords.lng },
      { name: dropoffText, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
      fare,
      distance,
      selectedType
    );
  };

  // Submit Rating Feedback
  const handleSubmitReview = (e) => {
    e.preventDefault();
    submitReview(rating, comment);
    // Reset inputs
    setPickupText('');
    setPickupCoords(null);
    setDropoffText('');
    setDropoffCoords(null);
    setRating(5);
    setComment('');
  };

  // 1. Rendering Rating & Review UI
  if (activeRide && activeRide.status === 'completed') {
    return (
      <div className="status-tracker">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Trip Completed! 🎉</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
          You have arrived safely at <strong>{activeRide.dropoff_name}</strong>.
        </p>

        <form onSubmit={handleSubmitReview} className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
          <span className="form-label" style={{ textAlign: 'center' }}>Rate your Driver ({activeRide.driver_name})</span>
          
          <div className="rating-container">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star-btn ${star <= rating ? 'active' : ''}`}
                onClick={() => setRating(star)}
              >
                <Star size={32} fill={star <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>

          <span className="form-label">Review comments</span>
          <textarea
            className="textarea-comment"
            placeholder="Share feedback about your ride (cleanliness, safety, timing...)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <button type="submit" className="btn-primary">
            Submit Rating
          </button>
        </form>
      </div>
    );
  }

  // 2. Rendering Active Ride Status Tracking
  if (activeRide) {
    const { status, driver_name, fare, pickup_name, dropoff_name } = activeRide;
    
    return (
      <div className="status-tracker">
        <div className="status-header">
          <h3 style={{ fontSize: '1.15rem' }}>Active Ride</h3>
          <span className="status-badge">{status.replace('_', ' ')}</span>
        </div>

        <div className="driver-info-box">
          <div className="driver-avatar">
            {driver_name ? driver_name.charAt(0) : '?'}
          </div>
          <div className="driver-details">
            <div className="driver-name">{driver_name || 'Finding your driver...'}</div>
            {driver_name ? (
              <div className="driver-meta">
                <Star size={12} fill="#f39c12" stroke="#f39c12" />
                <span>4.8 rating • Tesla Model S</span>
              </div>
            ) : (
              <div className="driver-meta" style={{ color: 'var(--color-cyan)' }}>
                Matching algorithms in progress...
              </div>
            )}
          </div>
        </div>

        {driverGPS && (
          <div className="glass-panel" style={{ padding: '14px 18px', background: 'rgba(0, 242, 254, 0.03)', borderGlow: '1px solid rgba(0, 242, 254, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
              <Clock size={16} className="brand-icon" />
              <span>
                {status === 'accepted' || status === 'en_route' 
                  ? `Driver arriving in ${driverGPS.eta_mins} mins`
                  : `Arriving at destination in ${driverGPS.eta_mins} mins`}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>From:</span> <strong>{pickup_name}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>To:</span> <strong>{dropoff_name}</strong>
          </div>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
            <span>Total Fare:</span>
            <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>${fare.toFixed(2)}</span>
          </div>
        </div>

        <button className="btn-danger" onClick={cancelRide} style={{ marginTop: '10px' }}>
          <X size={18} /> Cancel Ride
        </button>

        {(status === 'in_progress' || status === 'accepted' || status === 'en_route') && (
          <button className="btn-primary" onClick={completeRide} style={{ marginTop: '10px' }}>
            Complete Ride
          </button>
        )}
      </div>
    );
  }

  // 3. Booking Search Form UI
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>Request a Ride</h3>
      
      {/* Pickup Input */}
      <div className="form-group">
        <label className="form-label">Pickup Address</label>
        <div className="input-container">
          <MapPin size={18} className="input-icon" style={{ color: 'var(--color-cyan)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search pickup point (e.g. Union Square)"
            value={pickupText}
            onChange={(e) => handlePickupSearch(e.target.value)}
          />
        </div>
        
        {/* Pickup Autocompleter Dropdown */}
        {pickupSuggestions.length > 0 && (
          <div className="suggestions-list">
            {pickupSuggestions.map((loc, idx) => (
              <div key={idx} className="suggestion-item" onClick={() => selectPickup(loc)}>
                <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{loc.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dropoff Input */}
      <div className="form-group">
        <label className="form-label">Drop-off Destination</label>
        <div className="input-container">
          <Navigation size={18} className="input-icon" style={{ color: 'var(--color-pink)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search drop-off point (e.g. Fisherman's Wharf)"
            value={dropoffText}
            onChange={(e) => handleDropoffSearch(e.target.value)}
          />
        </div>

        {/* Dropoff Autocompleter Dropdown */}
        {dropoffSuggestions.length > 0 && (
          <div className="suggestions-list">
            {dropoffSuggestions.map((loc, idx) => (
              <div key={idx} className="suggestion-item" onClick={() => selectDropoff(loc)}>
                <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{loc.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fare Estimation & Vehicle Type Selection */}
      {fares && (
        <div style={{ animation: 'fade-in 0.3s ease-out' }}>
          <label className="form-label">Select Ride Type</label>
          <div className="vehicle-selector">
            <div 
              className={`vehicle-type-card ${selectedType === 'Economy' ? 'active' : ''}`}
              onClick={() => setSelectedType('Economy')}
            >
              <div className="vehicle-type-header">
                <span className="vehicle-type-name">Economy 🚗</span>
                <span className="vehicle-type-price">${fares.Economy}</span>
              </div>
              <span className="vehicle-type-desc">Affordable everyday cars</span>
            </div>

            <div 
              className={`vehicle-type-card ${selectedType === 'Premium' ? 'active' : ''}`}
              onClick={() => setSelectedType('Premium')}
            >
              <div className="vehicle-type-header">
                <span className="vehicle-type-name">Premium 🚙</span>
                <span className="vehicle-type-price">${fares.Premium}</span>
              </div>
              <span className="vehicle-type-desc">Spacious high-end rides</span>
            </div>

            <div 
              className={`vehicle-type-card ${selectedType === 'Luxury' ? 'active' : ''}`}
              onClick={() => setSelectedType('Luxury')}
            >
              <div className="vehicle-type-header">
                <span className="vehicle-type-name">Luxury 💎</span>
                <span className="vehicle-type-price">${fares.Luxury}</span>
              </div>
              <span className="vehicle-type-desc">Premium luxury comfort</span>
            </div>

            <div 
              className={`vehicle-type-card ${selectedType === 'Moto' ? 'active' : ''}`}
              onClick={() => setSelectedType('Moto')}
            >
              <div className="vehicle-type-header">
                <span className="vehicle-type-name">Moto 🏍️</span>
                <span className="vehicle-type-price">${fares.Moto}</span>
              </div>
              <span className="vehicle-type-desc">Quick single-passenger bikes</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', padding: '0 4px' }}>
            <span>Est. Distance:</span>
            <span><strong>{distance} km</strong></span>
          </div>

          <button className="btn-primary" onClick={handleBook}>
            Confirm Ride Request (${fares[selectedType]})
          </button>
        </div>
      )}

      {!fares && pickupCoords && dropoffCoords && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-cyan)' }}>Calculating estimated fare...</span>
        </div>
      )}

      {!fares && (!pickupCoords || !dropoffCoords) && (
        <div style={{ textAlign: 'center', padding: '20px 0', border: '1px dashed var(--border-light)', borderRadius: '12px', background: 'rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Enter pickup & drop-off locations to view fare estimations.
          </span>
        </div>
      )}
    </div>
  );
}
