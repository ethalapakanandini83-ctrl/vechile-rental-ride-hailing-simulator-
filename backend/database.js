import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.resolve(__dirname, 'app.db');

let SQL = null;
let db = null;

// Initialize SQL.js engine
async function initSQLJs() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

// Load or create database
async function loadDatabase() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const buffer = fs.readFileSync(dbFilePath);
      return new SQL.Database(buffer);
    } else {
      return new SQL.Database();
    }
  } catch (error) {
    console.error('Error loading database:', error);
    return new SQL.Database();
  }
}

// Save database to file
function saveDatabase() {
  try {
    if (db) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbFilePath, buffer);
    }
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

export const query = {
  all(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  },

  get(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();
      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  },

  run(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
      saveDatabase();
      return { changes: db.getRowsModified() };
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }
};

export async function initDatabase() {
  try {
    await initSQLJs();
    db = await loadDatabase();

    // Create tables
    db.run(`
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

    db.run(`
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

    db.run(`
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

    // Seed vehicles if empty
    const existing = query.get('SELECT COUNT(*) as count FROM vehicles');
    if (!existing || existing.count === 0) {
      const seedVehicles = [
        ['Tesla Model 3', 'car', 'Premium', 88, 450, 15.00, 37.7833, -122.4167],
        ['Ford Mustang Mach-E', 'car', 'Premium', 76, 380, 18.00, 37.7699, -122.4468],
        ['Vespa Elettrica', 'scooter', 'Economy', 92, 80, 5.00, 37.8024, -122.4058],
        ['BMW R 1250 GS', 'bike', 'Premium', 100, 350, 12.00, 37.7599, -122.4350],
        ['Chevy Bolt EV', 'car', 'Economy', 62, 220, 8.00, 37.7794, -122.4117],
        ['Porsche Taycan', 'car', 'Luxury', 95, 400, 35.00, 37.7954, -122.4028]
      ];

      for (const vehicle of seedVehicles) {
        query.run(
          'INSERT INTO vehicles (name, type, category, battery, range_km, price_per_hour, lat, lng, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [...vehicle, 'available']
        );
      }
    }

    saveDatabase();
    console.log('SQL.js database initialized at', dbFilePath);
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export default {
  close: () => {
    if (db) {
      saveDatabase();
      db.close();
    }
  }
};
