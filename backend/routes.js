import express from 'express';
import { query } from './database.js';

const router = express.Router();

// 1. GET /api/vehicles - List all vehicles
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await query.all('SELECT * FROM vehicles');
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/rides - List all rides
router.get('/rides', async (req, res) => {
  try {
    const rides = await query.all('SELECT * FROM rides ORDER BY created_at DESC');
    res.json(rides);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/rentals - List all rentals
router.get('/rentals', async (req, res) => {
  try {
    const rentals = await query.all('SELECT * FROM rentals ORDER BY created_at DESC');
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/fare - Estimate fare based on distance
router.post('/fare', (req, res) => {
  const { distanceKm } = req.body;
  if (distanceKm === undefined || distanceKm === null) {
    return res.status(400).json({ error: 'distanceKm is required' });
  }

  // Base rates by category
  const rates = {
    Economy: { base: 3.00, perKm: 1.50 },
    Premium: { base: 5.50, perKm: 2.20 },
    Luxury: { base: 10.00, perKm: 4.50 },
    Moto: { base: 2.00, perKm: 0.90 }
  };

  const estimations = {};
  for (const [key, val] of Object.entries(rates)) {
    estimations[key] = Math.round((val.base + distanceKm * val.perKm) * 100) / 100;
  }

  res.json({
    distance_km: distanceKm,
    estimations
  });
});

// 5. POST /api/ride/request - Book a new ride
router.post('/ride/request', async (req, res) => {
  const { id, pickupName, pickupLat, pickupLng, dropoffName, dropoffLat, dropoffLng, fare, distanceKm, vehicleType } = req.body;

  if (!id || !pickupName || !dropoffName || !fare || !vehicleType) {
    return res.status(400).json({ error: 'Missing required ride booking fields' });
  }

  try {
    const createdAt = new Date().toISOString();
    await query.run(
      `INSERT INTO rides (id, pickup_name, pickup_lat, pickup_lng, dropoff_name, dropoff_lat, dropoff_lng, fare, distance_km, status, vehicle_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, pickupName, pickupLat, pickupLng, dropoffName, dropoffLat, dropoffLng, fare, distanceKm, vehicleType, createdAt]
    );

    const ride = await query.get('SELECT * FROM rides WHERE id = ?', [id]);
    res.status(201).json(ride);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/ride/:id/cancel - Cancel ride
router.post('/ride/:id/cancel', async (req, res) => {
  const { id } = req.params;
  try {
    const ride = await query.get('SELECT * FROM rides WHERE id = ?', [id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    
    await query.run('UPDATE rides SET status = "cancelled" WHERE id = ?', [id]);
    res.json({ message: 'Ride cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/ride/:id/complete - Mark ride as completed manually
router.post('/ride/:id/complete', async (req, res) => {
  const { id } = req.params;
  try {
    const ride = await query.get('SELECT * FROM rides WHERE id = ?', [id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    await query.run('UPDATE rides SET status = "completed" WHERE id = ?', [id]);
    const updatedRide = await query.get('SELECT * FROM rides WHERE id = ?', [id]);
    res.json(updatedRide);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. POST /api/ride/:id/review - Review and rate driver
router.post('/ride/:id/review', async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (rating === undefined || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    const ride = await query.get('SELECT * FROM rides WHERE id = ?', [id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    await query.run(
      'UPDATE rides SET rating = ?, comment = ? WHERE id = ?',
      [rating, comment || '', id]
    );
    res.json({ message: 'Review submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. POST /api/rental/rent - Rent a vehicle
router.post('/rental/rent', async (req, res) => {
  const { id, vehicleId, durationHours } = req.body;
  if (!id || !vehicleId || !durationHours) {
    return res.status(400).json({ error: 'Missing required rental parameters' });
  }

  try {
    const vehicle = await query.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.status !== 'available') return res.status(400).json({ error: 'Vehicle is currently not available' });

    const totalCost = Math.round((vehicle.price_per_hour * durationHours) * 100) / 100;
    const createdAt = new Date().toISOString();

    // Begin SQLite Transaction
    await query.run('UPDATE vehicles SET status = "rented" WHERE id = ?', [vehicleId]);
    await query.run(
      `INSERT INTO rentals (id, vehicle_id, vehicle_name, duration_hours, total_cost, status, unlocked, engine_started, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', 0, 0, ?)`,
      [id, vehicleId, vehicle.name, durationHours, totalCost, createdAt]
    );

    const rental = await query.get('SELECT * FROM rentals WHERE id = ?', [id]);
    res.status(201).json({ rental, vehicle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. POST /api/rental/:id/return - Return a rented vehicle
router.post('/rental/:id/return', async (req, res) => {
  const { id } = req.params;
  try {
    const rental = await query.get('SELECT * FROM rentals WHERE id = ?', [id]);
    if (!rental) return res.status(404).json({ error: 'Rental not found' });
    if (rental.status !== 'active') return res.status(400).json({ error: 'Rental is already completed' });

    await query.run('UPDATE vehicles SET status = "available" WHERE id = ?', [rental.vehicle_id]);
    await query.run('UPDATE rentals SET status = "completed", unlocked = 0, engine_started = 0 WHERE id = ?', [id]);

    res.json({ message: 'Vehicle returned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. POST /api/rental/:id/control - Control locking, honking, trunk, engine state
router.post('/rental/:id/control', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'lock' | 'unlock' | 'start' | 'stop'

  try {
    const rental = await query.get('SELECT * FROM rentals WHERE id = ?', [id]);
    if (!rental) return res.status(404).json({ error: 'Rental not found' });
    if (rental.status !== 'active') return res.status(400).json({ error: 'Rental is not active' });

    if (action === 'lock') {
      await query.run('UPDATE rentals SET unlocked = 0, engine_started = 0 WHERE id = ?', [id]);
    } else if (action === 'unlock') {
      await query.run('UPDATE rentals SET unlocked = 1 WHERE id = ?', [id]);
    } else if (action === 'start') {
      if (!rental.unlocked && action === 'start') {
        return res.status(400).json({ error: 'Cannot start engine while vehicle is locked' });
      }
      await query.run('UPDATE rentals SET engine_started = 1 WHERE id = ?', [id]);
    } else if (action === 'stop') {
      await query.run('UPDATE rentals SET engine_started = 0 WHERE id = ?', [id]);
    }

    const updated = await query.get('SELECT * FROM rentals WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. GET /api/stats - Admin Dashboard numbers
router.get('/stats', async (req, res) => {
  try {
    const totalRides = await query.get('SELECT COUNT(*) as count FROM rides');
    const totalRentals = await query.get('SELECT COUNT(*) as count FROM rentals');
    
    const ridesRevenue = await query.get('SELECT SUM(fare) as sum FROM rides WHERE status = "completed"');
    const rentalsRevenue = await query.get('SELECT SUM(total_cost) as sum FROM rentals');
    
    const avgRating = await query.get('SELECT AVG(rating) as avg FROM rides WHERE rating IS NOT NULL');
    const completedCount = await query.get('SELECT COUNT(*) as count FROM rides WHERE status = "completed"');
    const cancelledCount = await query.get('SELECT COUNT(*) as count FROM rides WHERE status = "cancelled"');

    const recentTrips = await query.all('SELECT * FROM rides ORDER BY created_at DESC LIMIT 5');
    
    res.json({
      totals: {
        rides: totalRides.count,
        rentals: totalRentals.count,
        completedRides: completedCount.count,
        cancelledRides: cancelledCount.count,
        ridesRevenue: Math.round((ridesRevenue.sum || 0) * 100) / 100,
        rentalsRevenue: Math.round((rentalsRevenue.sum || 0) * 100) / 100,
        totalRevenue: Math.round(((ridesRevenue.sum || 0) + (rentalsRevenue.sum || 0)) * 100) / 100,
        avgRating: avgRating.avg ? Math.round(avgRating.avg * 10) / 10 : 0
      },
      recentTrips
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. POST /api/reset-db - Reset and seed database
router.post('/reset-db', async (req, res) => {
  try {
    await query.run('DROP TABLE IF EXISTS rentals');
    await query.run('DROP TABLE IF EXISTS rides');
    await query.run('DROP TABLE IF EXISTS vehicles');

    // Recreate & Seed
    await query.run(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        battery INTEGER NOT NULL,
        range_km INTEGER NOT NULL,
        price_per_hour REAL NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'available'
      )
    `);

    await query.run(`
      CREATE TABLE IF NOT EXISTS rides (
        id TEXT PRIMARY KEY,
        pickup_name TEXT NOT NULL,
        pickup_lat REAL NOT NULL,
        pickup_lng REAL NOT NULL,
        dropoff_name TEXT NOT NULL,
        dropoff_lat REAL NOT NULL,
        dropoff_lng REAL NOT NULL,
        fare REAL NOT NULL,
        distance_km REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        driver_name TEXT,
        driver_lat REAL,
        driver_lng REAL,
        vehicle_type TEXT,
        rating INTEGER,
        comment TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await query.run(`
      CREATE TABLE IF NOT EXISTS rentals (
        id TEXT PRIMARY KEY,
        vehicle_id INTEGER NOT NULL,
        vehicle_name TEXT NOT NULL,
        duration_hours INTEGER NOT NULL,
        total_cost REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        unlocked INTEGER DEFAULT 0,
        engine_started INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
      )
    `);

    const seedVehicles = [
      { name: 'Tesla Model 3', type: 'car', category: 'Premium', battery: 88, range_km: 450, price_per_hour: 15.00, lat: 37.7833, lng: -122.4167 },
      { name: 'Ford Mustang Mach-E', type: 'car', category: 'Premium', battery: 76, range_km: 380, price_per_hour: 18.00, lat: 37.7699, lng: -122.4468 },
      { name: 'Vespa Elettrica', type: 'scooter', category: 'Economy', battery: 92, range_km: 80, price_per_hour: 5.00, lat: 37.8024, lng: -122.4058 },
      { name: 'BMW R 1250 GS', type: 'bike', category: 'Premium', battery: 100, range_km: 350, price_per_hour: 12.00, lat: 37.7599, lng: -122.4350 },
      { name: 'Chevy Bolt EV', type: 'car', category: 'Economy', battery: 62, range_km: 220, price_per_hour: 8.00, lat: 37.7794, lng: -122.4117 },
      { name: 'Porsche Taycan', type: 'car', category: 'Luxury', battery: 95, range_km: 400, price_per_hour: 35.00, lat: 37.7954, lng: -122.4028 }
    ];

    for (const v of seedVehicles) {
      await query.run(
        `INSERT INTO vehicles (name, type, category, battery, range_km, price_per_hour, lat, lng, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
        [v.name, v.type, v.category, v.battery, v.range_km, v.price_per_hour, v.lat, v.lng]
      );
    }

    res.json({ message: 'Database reset and seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
