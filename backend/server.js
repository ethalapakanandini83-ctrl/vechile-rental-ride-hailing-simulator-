import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import routes from './routes.js';
import { initDatabase, query } from './database.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/api', routes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Cache to keep track of active simulators so we can cancel them if needed
const activeSimulations = new Map();

// Helper to interpolate points between two coordinates
function interpolatePoints(start, end, stepsCount) {
  const points = [];
  for (let i = 0; i <= stepsCount; i++) {
    const ratio = i / stepsCount;
    const lat = start.lat + (end.lat - start.lat) * ratio;
    const lng = start.lng + (end.lng - start.lng) * ratio;
    points.push({ lat, lng });
  }
  return points;
}

// Simulated automated driver logic
async function runAutomatedRideSimulation(rideId, pickup, dropoff) {
  console.log(`Starting AI driver simulation for ride: ${rideId}`);
  
  // 1. Random driver starting point (roughly 300-600m away from pickup)
  const angle = Math.random() * Math.PI * 2;
  const distance = 0.004 + Math.random() * 0.003; // degrees approx
  const driverStart = {
    lat: pickup.lat + Math.sin(angle) * distance,
    lng: pickup.lng + Math.cos(angle) * distance
  };

  const driverNames = ['Sophia Williams', 'Marcus Vance', 'David Miller', 'Emma Watson', 'Carlos Santana'];
  const driverName = driverNames[Math.floor(Math.random() * driverNames.length)];

  // Wait 3 seconds to simulate "finding a driver"
  const waitTimeout = setTimeout(async () => {
    try {
      await query.run(
        `UPDATE rides SET status = "accepted", driver_name = ?, driver_lat = ?, driver_lng = ? WHERE id = ?`,
        [driverName, driverStart.lat, driverStart.lng, rideId]
      );
      
      const updatedRide = await query.get('SELECT * FROM rides WHERE id = ?', [rideId]);
      io.to(rideId).emit('ride_status_update', updatedRide);
      console.log(`AI driver ${driverName} accepted ride ${rideId}`);

      // Start driving to pickup (10 steps)
      const toPickupPath = interpolatePoints(driverStart, pickup, 10);
      let stepIndex = 0;

      const driveToPickupInterval = setInterval(async () => {
        if (stepIndex < toPickupPath.length) {
          const currentPos = toPickupPath[stepIndex];
          
          await query.run(
            `UPDATE rides SET driver_lat = ?, driver_lng = ? WHERE id = ?`,
            [currentPos.lat, currentPos.lng, rideId]
          );
          
          io.to(rideId).emit('driver_gps_update', {
            rideId,
            lat: currentPos.lat,
            lng: currentPos.lng,
            eta_mins: Math.ceil((toPickupPath.length - stepIndex) * 0.5)
          });
          
          stepIndex++;
        } else {
          // Arrived at pickup
          clearInterval(driveToPickupInterval);
          
          await query.run(`UPDATE rides SET status = "en_route" WHERE id = ?`, [rideId]);
          let updated = await query.get('SELECT * FROM rides WHERE id = ?', [rideId]);
          io.to(rideId).emit('ride_status_update', updated);
          console.log(`AI driver arrived at pickup for ride ${rideId}`);

          // Wait 3 seconds for passenger to board, then start trip
          const boardTimeout = setTimeout(async () => {
            await query.run(`UPDATE rides SET status = "in_progress" WHERE id = ?`, [rideId]);
            updated = await query.get('SELECT * FROM rides WHERE id = ?', [rideId]);
            io.to(rideId).emit('ride_status_update', updated);
            console.log(`Trip in progress for ride ${rideId}`);

            // Start driving to dropoff (15 steps)
            const toDropoffPath = interpolatePoints(pickup, dropoff, 15);
            let dropoffStep = 0;

            const driveToDropoffInterval = setInterval(async () => {
              if (dropoffStep < toDropoffPath.length) {
                const currentPos = toDropoffPath[dropoffStep];
                
                await query.run(
                  `UPDATE rides SET driver_lat = ?, driver_lng = ? WHERE id = ?`,
                  [currentPos.lat, currentPos.lng, rideId]
                );
                
                io.to(rideId).emit('driver_gps_update', {
                  rideId,
                  lat: currentPos.lat,
                  lng: currentPos.lng,
                  eta_mins: Math.ceil((toDropoffPath.length - dropoffStep) * 0.5)
                });
                
                dropoffStep++;
              } else {
                // Arrived at dropoff / Completed
                clearInterval(driveToDropoffInterval);
                
                await query.run(`UPDATE rides SET status = "completed" WHERE id = ?`, [rideId]);
                updated = await query.get('SELECT * FROM rides WHERE id = ?', [rideId]);
                io.to(rideId).emit('ride_status_update', updated);
                console.log(`AI trip completed for ride ${rideId}`);
                
                activeSimulations.delete(rideId);
              }
            }, 1000);

            activeSimulations.set(rideId, { interval: driveToDropoffInterval, type: 'dropoff' });
          }, 3000);

          activeSimulations.set(rideId, { timeout: boardTimeout, type: 'boarding' });
        }
      }, 1000);

      activeSimulations.set(rideId, { interval: driveToPickupInterval, type: 'pickup' });

    } catch (err) {
      console.error('Error during AI simulation drive logic:', err);
    }
  }, 3000);

  activeSimulations.set(rideId, { timeout: waitTimeout, type: 'searching' });
}

// Websocket logic
io.on('connection', (socket) => {
  console.log('Client connected to WebSocket:', socket.id);

  // 1. Join a ride tracking room
  socket.on('join_ride_room', (rideId) => {
    socket.join(rideId);
    console.log(`Socket ${socket.id} joined room: ${rideId}`);
  });

  // 2. Client requests a ride booking
  socket.on('request_ride', (rideData) => {
    const { id, pickup, dropoff } = rideData;
    // Start automated simulation for this ride ID
    runAutomatedRideSimulation(id, pickup, dropoff);
  });

  // 3. User cancels a ride
  socket.on('cancel_ride_simulation', (rideId) => {
    console.log(`Cancelling simulation for ride ${rideId}`);
    const active = activeSimulations.get(rideId);
    if (active) {
      if (active.timeout) clearTimeout(active.timeout);
      if (active.interval) clearInterval(active.interval);
      activeSimulations.delete(rideId);
    }
  });

  // 4. Human driver interactions
  socket.on('driver_join_pool', () => {
    socket.join('driver_pool');
    console.log(`Driver socket ${socket.id} joined the driver pool`);
  });

  // Human driver accepts a ride
  socket.on('human_driver_accept', async ({ rideId, driverName, driverLat, driverLng }) => {
    console.log(`Human driver ${driverName} accepted ride ${rideId}`);
    
    // Stop any AI simulator that was running on this ride
    const active = activeSimulations.get(rideId);
    if (active) {
      if (active.timeout) clearTimeout(active.timeout);
      if (active.interval) clearInterval(active.interval);
      activeSimulations.delete(rideId);
    }

    try {
      await query.run(
        `UPDATE rides SET status = "accepted", driver_name = ?, driver_lat = ?, driver_lng = ? WHERE id = ?`,
        [driverName, driverLat, driverLng, rideId]
      );
      
      const updatedRide = await query.get('SELECT * FROM rides WHERE id = ?', [rideId]);
      io.to(rideId).emit('ride_status_update', updatedRide);
      // Notify driver pool that this ride is taken
      io.to('driver_pool').emit('ride_taken', rideId);
    } catch (err) {
      console.error(err);
    }
  });

  // Human driver update coordinates
  socket.on('human_driver_gps', async ({ rideId, lat, lng, eta_mins }) => {
    try {
      await query.run(
        `UPDATE rides SET driver_lat = ?, driver_lng = ? WHERE id = ?`,
        [lat, lng, rideId]
      );
      io.to(rideId).emit('driver_gps_update', { rideId, lat, lng, eta_mins });
    } catch (err) {
      console.error(err);
    }
  });

  // Human driver status progression
  socket.on('human_driver_status', async ({ rideId, status }) => {
    console.log(`Human driver updated ride ${rideId} status to ${status}`);
    try {
      await query.run(`UPDATE rides SET status = ? WHERE id = ?`, [status, rideId]);
      const updatedRide = await query.get('SELECT * FROM rides WHERE id = ?', [rideId]);
      io.to(rideId).emit('ride_status_update', updatedRide);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize DB and start server
async function startServer() {
  try {
    await initDatabase();
    server.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`   RIDE SIMULATOR SERVER RUNNING ON PORT ${PORT}`);
      console.log(`   REST API: http://localhost:${PORT}/api`);
      console.log(`   WebSockets ready for connections`);
      console.log(`===================================================`);
    });
  } catch (err) {
    console.error('Failed to start server due to DB initialization error:', err);
  }
}

startServer();
