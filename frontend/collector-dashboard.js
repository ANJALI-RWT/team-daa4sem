//frontend/collector-dashboard.js
const API_BASE = 'https://team-daa4sem.onrender.com';
let map;
let binMarkers = [];
let collectorMarker;

// Initialize map centered on collector location
function initMap(lat, lng) {
  map = L.map('map').setView([lat, lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  collectorMarker = L.marker([lat, lng], { title: "Collector" })
    .addTo(map)
    .bindPopup('👷 Collector')
    .openPopup();

  fetchAndDisplayBins(); // Initial fetch
  setInterval(fetchAndDisplayBins, 10000); // Refresh every 10 seconds
}

// ✅ Fetch and display full bins on map with debug logs
async function fetchAndDisplayBins() {
  console.log("🔄 Fetching full bins...");

  try {
    const res = await fetch(`${API_BASE}/api/full-bins`);
    const bins = await res.json();

    console.log("🚨 Full Bins:", bins); // Debug log

    // Remove old markers
    binMarkers.forEach(marker => map.removeLayer(marker));
    binMarkers = [];

    // Add new bin markers
    bins.forEach(bin => {
      const marker = L.marker([bin.lat, bin.lng], {
        title: `Bin ${bin.id} (${bin.type})`,
        icon: L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/484/484167.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        })
      }).addTo(map);

      marker.bindPopup(`
        <strong>🗑️ Bin ${bin.type}</strong><br/>
        ID: ${bin.id}<br/>
        <button onclick="pickupBin('${bin.id}')">✅ Mark as Picked</button>
      `);

      binMarkers.push(marker);
    });
  } catch (err) {
    console.error("❌ Error fetching bins:", err);
  }
}

// Confirm pickup and reset bin
async function pickupBin(binId) {
  try {
    await fetch(`${API_BASE}/api/pickup-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binId })
    });
    alert(`✅ Bin ${binId} marked as collected`);
    fetchAndDisplayBins(); // Refresh after pickup
  } catch (err) {
    alert("❌ Failed to confirm pickup");
    console.error("Error:", err);
  }
}

// Use geolocation to get collector position and initialize map
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    initMap(pos.coords.latitude, pos.coords.longitude);
  }, () => {
    alert('Geolocation denied or unavailable. Showing default location.');
    initMap(20.5937, 78.9629); // Default to India center
  });
} else {
  alert('Geolocation not supported by your browser');
  initMap(20.5937, 78.9629);
}

// Expose pickupBin globally so it works inside marker popup
window.pickupBin = pickupBin;
