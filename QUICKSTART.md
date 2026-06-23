# 🚀 Quick Start Guide

Get your Ride-Hailing Simulator running in 5 minutes!

## Prerequisites
- **Node.js 16+** and **npm** installed
- Git (to clone or download the project)

## Setup Steps

### 1️⃣ Navigate to Project Directory
```bash
cd "Vehicle Rental & Ride Hailing Simulator"
```

### 2️⃣ Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 3️⃣ Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 4️⃣ Start Backend Server (Terminal 1)
```bash
cd backend
npm start
```
✅ You should see:
```
===================================================
   RIDE SIMULATOR SERVER RUNNING ON PORT 5000
   REST API: http://localhost:5000/api
   WebSockets ready for connections
===================================================
```

### 5️⃣ Start Frontend Dev Server (Terminal 2)
```bash
cd frontend
npm run dev
```
✅ You should see:
```
  Local:   http://localhost:3000/
```

### 6️⃣ Open in Browser
Navigate to **http://localhost:3000** 🎉

---

## 🎮 First-Time Demo (3 minutes)

### Try as a Passenger
1. Click **"Ride"** tab (default)
2. Type pickup: `Union Square` → select first result
3. Type dropoff: `Fisherman's Wharf` → select
4. Select **"Economy"** vehicle type
5. Click **"Confirm Ride Request"**
6. Watch the map! 🗺️
   - Cyan dot = you (pickup location)
   - Purple circle = driver arriving
   - Red pin = destination
   - Polyline = route
7. After 25-30 seconds, ride completes automatically
8. Rate the driver (click stars, add comment)
9. Submit!

### Try as a Driver
1. Click **"Driver"** tab
2. Watch the job queue populate with pending requests
3. Click **"Accept Job"** on any ride
4. Click **"Navigate to Pickup"** → watch automated GPS
5. Click **"Passenger Boarded • Start Trip"**
6. Watch the map animate to destination
7. Earnings appear at top! 💰

### Try as Admin
1. Click **"Admin"** tab
2. View **Revenue**, **Avg Rating**, **Bookings**, **Rentals**
3. Click dropdown: switch between **"vehicles"**, **"rides"**, **"rentals"**
4. Select **"Trip History"** to see completed trips
5. Click **"Reset DB"** to clear all data

### Try Vehicle Rental
1. Click **"Rent"** tab
2. Select **2 Hours** from dropdown
3. Click **"Book"** on any vehicle (e.g., Tesla Model 3)
4. Use the virtual keyfob:
   - **Unlock** button
   - **Start** button (engine sound!)
   - **Honk** button (horn sound!)
   - **Lock** button
5. Click **"Return Vehicle"**

---

## 📊 Architecture at a Glance

```
Frontend (React + Vite)
   ↓ /api proxy ↓
Backend (Express + Socket.io)
   ↓
SQLite Database (app.db)
```

- **WebSocket**: Real-time driver GPS & ride updates
- **REST API**: Bookings, ratings, rentals, analytics
- **Database**: Persistent storage (SQLite)

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `EADDRINUSE: port 5000 already in use` | Kill process on 5000: `lsof -ti:5000 \| xargs kill -9` (Mac/Linux) or Task Manager (Windows) |
| `Cannot GET /api/vehicles` | Backend not running. Check Terminal 1. |
| `WebSocket connection failed` | Backend port is 5000, frontend proxy in `vite.config.js` should target it. |
| `Map shows blank gray` | Leaflet CSS not loaded. Check browser DevTools Console. |
| Database file corrupted | Delete `backend/app.db` and restart backend. |

---

## 📚 Next Steps

- Read [README.md](./README.md) for comprehensive documentation
- Explore [backend/routes.js](./backend/routes.js) to understand API structure
- Check [frontend/src/context/AppContext.jsx](./frontend/src/context/AppContext.jsx) for state management
- Modify [frontend/src/utils/mockGeocoding.js](./frontend/src/utils/mockGeocoding.js) to add more SF landmarks

---

## 💡 Pro Tips

1. **Multiple Roles**: Open 2-3 browser tabs, switch roles in each. One as passenger, one as driver, one as admin!
2. **Speed Up Simulation**: Edit timeouts in `backend/server.js` `runAutomatedRideSimulation()` function
3. **Custom Locations**: Add more landmarks to `LOCATIONS` array in `mockGeocoding.js`
4. **Keyfob Sounds**: Web Audio synthesis in `frontend/src/utils/audioSynth.js` - customize frequencies!

---

**Enjoy your ride-hailing simulator! 🚗💨**
