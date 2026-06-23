// Local landmark list for San Francisco geocoding simulation
export const LOCATIONS = [
  { name: 'Union Square, SF', lat: 37.7879, lng: -122.4074 },
  { name: "Fisherman's Wharf, SF", lat: 37.8080, lng: -122.4177 },
  { name: 'Golden Gate Park, SF', lat: 37.7694, lng: -122.4862 },
  { name: 'Coit Tower, SF', lat: 37.8024, lng: -122.4058 },
  { name: 'Chinatown, SF', lat: 37.7941, lng: -122.4078 },
  { name: 'Lombard Street (Crookedest St), SF', lat: 37.8021, lng: -122.4187 },
  { name: 'Alcatraz Landing (Pier 33), SF', lat: 37.8066, lng: -122.4046 },
  { name: 'Salesforce Tower, SF', lat: 37.7897, lng: -122.3972 },
  { name: 'Mission Dolores Park, SF', lat: 37.7596, lng: -122.4269 },
  { name: 'San Francisco International Airport (SFO)', lat: 37.6213, lng: -122.3790 },
  { name: 'Ocean Beach, SF', lat: 37.7594, lng: -122.5107 },
  { name: 'Twin Peaks Lookout, SF', lat: 37.7544, lng: -122.4477 },
  { name: 'Palace of Fine Arts, SF', lat: 37.8029, lng: -122.4484 },
  { name: 'Ghirardelli Square, SF', lat: 37.8052, lng: -122.4220 },
  { name: 'Ferry Building Terminal, SF', lat: 37.7955, lng: -122.3937 },
  { name: 'Oracle Park (SF Giants Stadium)', lat: 37.7786, lng: -122.3893 },
  { name: 'Haight-Ashbury Intersection, SF', lat: 37.7699, lng: -122.4468 },
  { name: 'Castro Theatre, SF', lat: 37.7620, lng: -122.4348 }
];

// Search suggestions
export function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];
  const cleanQuery = query.toLowerCase();
  return LOCATIONS.filter(loc => loc.name.toLowerCase().includes(cleanQuery));
}

// Haversine formula to compute straight-line distance in kilometers
export function getHaversineDistance(coords1, coords2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * Math.PI / 180) * 
    Math.cos(coords2.lat * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 100) / 100;
}

// Generate coordinate lines for routing polylines on Leaflet
export function generateRoutePolyline(start, end, steps = 30) {
  const points = [];
  // Add a slight curvature to the route to make it look like a street route rather than straight line!
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;
  const offset = 0.002; // Small offset for curvature
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Bezier curve formula for realistic arc routing
    const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * (midLat + offset) + t * t * end.lat;
    const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * (midLng - offset) + t * t * end.lng;
    points.push([lat, lng]);
  }
  return points;
}
