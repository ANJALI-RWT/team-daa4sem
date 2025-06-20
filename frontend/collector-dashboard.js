let map, collectorMarker, routeLine;
let fullBins = [];
let currentPosition = null;

const API_BASE = location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://team-daa4sem.onrender.com';

// Custom icons
const redIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/484/484167.png',
  iconSize: [30, 30]
});
const blueIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [25, 25]
});

// Load collector info from sessionStorage (or set manually for demo)
const collectorName = sessionStorage.getItem('collectorName') || 'Demo Collector';
const truckCapacity = sessionStorage.getItem('truckCapacity') || '4';

// Update interface with collector info
document.getElementById('collectorName').textContent = collectorName;
document.getElementById('truckCapacity').textContent = truckCapacity;

// 🌍 Geolocation
navigator.geolocation.getCurrentPosition(pos => {
  currentPosition = pos.coords;
  document.getElementById('collectorLocation').textContent = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
  initMap(pos.coords.latitude, pos.coords.longitude);
}, err => {
  alert('📍 Location access is required.');
});

// 🗺️ Init Leaflet Map
function initMap(lat, lng) {
  map = L.map('map').setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  collectorMarker = L.marker([lat, lng], { icon: blueIcon }).addTo(map);
  loadBinsAndRoute(lat, lng);
}

// 📡 Load full bins
async function loadBinsAndRoute(lat, lng) {
  const res = await fetch(`${API_BASE}/api/full-bins`);
  fullBins = await res.json();

  fullBins.forEach(bin => {
    const marker = L.marker([bin.lat, bin.lng], { icon: redIcon }).addTo(map);
    marker.bindPopup(`
      🟥 <b>Full Bin</b><br>Type: ${bin.type}<br>Bin ID: ${bin.id}<br>
      <button class="btn-pickup" onclick="pickupBin('${bin.id}')">✅ Pickup Done</button>
    `);
  });

  if (fullBins.length > 0) {
    drawRouteToNearestBin(lat, lng, fullBins);
  }
}

// 📏 Route to nearest bin (basic polyline)
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

  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline([[lat, lng], [nearest.lat, nearest.lng]], { color: 'blue' }).addTo(map);
}

// 📦 Confirm pickup
async function pickupBin(binId) {
  await fetch(`${API_BASE}/api/pickup-confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId })
  });

  alert(`✅ Bin ${binId} marked as collected.`);
  location.reload();
}

// 🧮 Distance calculation
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
