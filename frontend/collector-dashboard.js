let map, collectorMarker, routeLine;
let fullBins = [];
let currentPosition = null;

// Initialize map
function initMap(lat, lng) {
  map = L.map('map').setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  collectorMarker = L.marker([lat, lng], { title: 'You', icon: blueIcon }).addTo(map);
  loadBinsAndRoute(lat, lng);
}

// Custom icons
const redIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/484/484167.png',
  iconSize: [30, 30]
});
const blueIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [25, 25]
});

// Load full bins from backend
async function loadBinsAndRoute(lat, lng) {
  const API_BASE = location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://team-daa4sem.onrender.com';
  const res = await fetch(`${API_BASE}/api/full-bins`);
  fullBins = await res.json();

  fullBins.forEach(bin => {
    const marker = L.marker([bin.lat, bin.lng], { icon: redIcon }).addTo(map);
    marker.bindPopup(`
      🟥 <b>Full Bin</b><br>Type: ${bin.type}<br>Bin ID: ${bin.id}<br>
      <button class="btn-pickup" onclick="pickupBin('${bin.id}')">Pickup Done</button>
    `);
  });

  if (fullBins.length > 0) {
    drawRouteToNearestBin(lat, lng, fullBins);
  }
}

// Route using polyline
function drawRouteToNearestBin(lat, lng, bins) {
  let nearest = bins[0];
  let minDist = Infinity;

  bins.forEach(bin => {
    const dist = getDistance(lat, lng, bin.lat, bin.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = bin;
    }
  });

  // Simulate route with polyline (replace with OSRM for real road routing)
  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline([[lat, lng], [nearest.lat, nearest.lng]], { color: 'blue' }).addTo(map);
}

// Haversine formula to find distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI/180;
  const dLon = (lon2 - lon1) * Math.PI/180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) *
            Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Confirm pickup → reset bin
async function pickupBin(binId) {
  const API_BASE = location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://team-daa4sem.onrender.com';
  await fetch(`${API_BASE}/api/pickup-confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId })
  });
  alert(`✅ Bin ${binId} pickup confirmed.`);
  location.reload();
}

// Get live location
navigator.geolocation.getCurrentPosition(pos => {
  currentPosition = pos.coords;
  initMap(pos.coords.latitude, pos.coords.longitude);
}, err => {
  alert('📍 Location access required.');
});
