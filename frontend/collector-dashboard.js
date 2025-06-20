const API_BASE = 'https://team-daa4sem.onrender.com';
const USERNAME = sessionStorage.getItem('username');

let map;
let routingControl;
let binMarkers = [];

function initMap() {
  map = L.map('collectorMap').setView([20.5937, 78.9629], 5); // Default India center

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve([pos.coords.latitude, pos.coords.longitude]),
      err => reject('❌ Could not get current location')
    );
  });
}

async function fetchFullBinsAndDrawRoute() {
  try {
    // 1. Get collector location
    const collectorLocation = await getCurrentLocation();
    map.setView(collectorLocation, 14);

    // 2. Fetch full bins from backend
    const res = await fetch(`${API_BASE}/api/full-bins`);
    if (!res.ok) throw new Error('Failed to fetch full bin data');

    const bins = await res.json(); // Expected: [{ lat, lng, type, zone, id }]
    clearMapMarkers();

    if (bins.length === 0) {
      alert('✅ No full bins at the moment.');
      return;
    }

    // 3. Mark each bin on the map
    bins.forEach(bin => {
      const marker = L.marker([bin.lat, bin.lng], {
        title: `${bin.type} Bin - ${bin.zone}`,
        icon: L.icon({
          iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        })
      }).addTo(map)
        .bindPopup(`<strong>${bin.type} Bin</strong><br>Zone: ${bin.zone}<br>ID: ${bin.id}`);
      binMarkers.push(marker);
    });

    // 4. Draw route to the first full bin
    drawRoute(collectorLocation, [bins[0].lat, bins[0].lng]);

  } catch (error) {
    console.error('❌ Error in fetchFullBinsAndDrawRoute:', error);
  }
}

function drawRoute(from, to) {
  if (routingControl) {
    map.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(from[0], from[1]),
      L.latLng(to[0], to[1])
    ],
    routeWhileDragging: false,
    show: false,
    addWaypoints: false
  }).addTo(map);
}

function clearMapMarkers() {
  binMarkers.forEach(marker => map.removeLayer(marker));
  binMarkers = [];
}

function refreshEverything() {
  fetchUserBinStatus();          // Optional personal bin display
  fetchFullBinsAndDrawRoute();   // Fetch map markers + route
}

async function fetchUserBinStatus() {
  if (!USERNAME) return;

  try {
    const res = await fetch(`${API_BASE}/api/get-user/${USERNAME}`);
    if (!res.ok) throw new Error('Failed to fetch user data');

    const user = await res.json();

    const bioPercent = Math.min(100, ((user.currentBioWeight / user.bioCapacity) * 100).toFixed(1));
    const nonBioPercent = Math.min(100, ((user.currentNonBioWeight / user.nonBioCapacity) * 100).toFixed(1));

    document.getElementById("bio-fill").textContent =
      `${user.currentBioWeight} / ${user.bioCapacity} kg (${bioPercent}%)`;

    document.getElementById("nonbio-fill").textContent =
      `${user.currentNonBioWeight} / ${user.nonBioCapacity} kg (${nonBioPercent}%)`;

    document.getElementById("bio-status").textContent = user.bioStatus;
    document.getElementById("nonbio-status").textContent = user.nonBioStatus;

    document.getElementById("bio-status").style.color =
      user.bioStatus === 'Needs Pickup' ? 'red' : 'green';

    document.getElementById("nonbio-status").style.color =
      user.nonBioStatus === 'Needs Pickup' ? 'red' : 'green';

  } catch (error) {
    console.error('❌ Error fetching bin status:', error);
  }
}

// 🔁 Auto-refresh logic
window.onload = () => {
  initMap();
  refreshEverything();
  setInterval(refreshEverything, 30000); // Every 30 seconds
};
