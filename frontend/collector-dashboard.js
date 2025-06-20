cconst API_BASE = 'https://team-daa4sem.onrender.com';
let map;
let binMarkers = [];
let collectorMarker;
let collectorLat = 20.5937, collectorLng = 78.9629; // default India
let routeLine = null; // store current polyline route
let routingControl = null; // for Leaflet Routing Machine

// Initialize map centered on collector location
function initMap(lat, lng) {
  collectorLat = lat;
  collectorLng = lng;
  map = L.map('map').setView([lat, lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  collectorMarker = L.marker([lat, lng], { title: "Collector" })
    .addTo(map)
    .bindPopup('👷 Collector')
    .openPopup();

  fetchAndDisplayBins();
  setInterval(fetchAndDisplayBins, 10000); // Refresh every 10s
}

// Fetch and display full bins on map
async function fetchAndDisplayBins() {
  console.log("🔄 Fetching full bins...");
  const res = await fetch(`${API_BASE}/api/full-bins`);
  const bins = await res.json();
  console.log("🚨 Full Bins:", bins);

  // Remove old markers
  binMarkers.forEach(marker => map.removeLayer(marker));
  binMarkers = [];

  let nearestBin = null;
  let minDistance = Infinity;

  bins.forEach(bin => {
    const marker = L.marker([bin.lat, bin.lng], {
      title: `Bin ${bin._id} (${bin.type})`,
      icon: L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/484/484167.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      })
    }).addTo(map);

    marker.bindPopup(`
      <strong>🗑️ Bin ${bin.type}</strong><br/>
      ID: ${bin._id}<br/>
      <button onclick="pickupBin('${bin._id}')">✅ Mark as Picked</button>
    `);

    binMarkers.push(marker);

    // Find nearest bin
    const dist = getDistance(collectorLat, collectorLng, bin.lat, bin.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestBin = bin;
    }
  });

  if (nearestBin) drawRouteToBin(nearestBin);
}

// Draw road route using Leaflet Routing Machine
function drawRouteToBin(bin) {
  if (routingControl) map.removeControl(routingControl);

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(collectorLat, collectorLng),
      L.latLng(bin.lat, bin.lng)
    ],
    routeWhileDragging: false,
    show: false,
    createMarker: () => null
  }).addTo(map);
}

// Haversine formula to compute distance between two lat/lng points
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in km
}

// Confirm pickup and reset bin
async function pickupBin(binId) {
  await fetch(`${API_BASE}/api/pickup-confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ binId })
  });
  alert(`✅ Bin ${binId} marked as collected`);
  fetchAndDisplayBins(); // Refresh bin markers
}

// Use geolocation to get collector position and initialize map
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(pos => {
    initMap(pos.coords.latitude, pos.coords.longitude);
  }, () => {
    alert('Geolocation denied or unavailable. Showing default location.');
    initMap(collectorLat, collectorLng);
  });
} else {
  alert('Geolocation not supported by your browser');
  initMap(collectorLat, collectorLng);
}

// Expose pickupBin globally so button onclick inside popup works
window.pickupBin = pickupBin;

// ✅ OPTIONAL: For Admin Panel to Display Full Bins in Table
async function fetchFullBinsForAdmin() {
  try {
    const res = await fetch(`${API_BASE}/api/full-bins`);
    const bins = await res.json();
    const table = document.getElementById('full-bins-table');
    if (!table) return;

    table.innerHTML = `<tr><th>Username</th><th>Type</th><th>Latitude</th><th>Longitude</th></tr>`;
    bins.forEach(bin => {
      const row = `<tr>
        <td>${bin.username}</td>
        <td>${bin.type}</td>
        <td>${bin.lat}</td>
        <td>${bin.lng}</td>
      </tr>`;
      table.innerHTML += row;
    });
  } catch (err) {
    console.error('Error fetching full bins for admin:', err);
  }
}

window.fetchFullBinsForAdmin = fetchFullBinsForAdmin;
// To use in admin HTML: call fetchFullBinsForAdmin() on page load....require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

/* ------------------ Schema Definitions ------------------ */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  location: { type: String, required: true }, // "lat,lng"
  bioCapacity: { type: Number, required: true, min: 0 },
  nonBioCapacity: { type: Number, required: true, min: 0 },
  currentBioWeight: { type: Number, default: 0 },
  currentNonBioWeight: { type: Number, default: 0 },
  bioStatus: { type: String, default: 'Okay' },
  nonBioStatus: { type: String, default: 'Okay' },
  zone: { type: String, default: 'Zone A' }
});

const collectorSchema = new mongoose.Schema({
  username: { type: String, required: true },
  location: { type: String, required: true },
  truckCapacity: { type: Number, required: true, min: 1 }
});

const fullBinSchema = new mongoose.Schema({
  username: { type: String, required: true },
  lat: Number,
  lng: Number,
  type: String
});

const User = mongoose.model('User', userSchema);
const Collector = mongoose.model('Collector', collectorSchema);
const FullBin = mongoose.model('FullBin', fullBinSchema);

/* ------------------ Routes ------------------ */

// 🌱 Root Test
app.get('/', (req, res) => {
  res.send('🌱 Smart Waste Management Backend is running.');
});

// 📌 Register User
app.post('/api/register/user', async (req, res) => {
  try {
    const { username, location, bioCapacity, nonBioCapacity, zone } = req.body;
    if (!username || !location || bioCapacity == null || nonBioCapacity == null) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const newUser = new User({
      username,
      location,
      bioCapacity,
      nonBioCapacity,
      zone: zone || 'Zone A'
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 📌 Register Collector
app.post('/api/register/collector', async (req, res) => {
  try {
    const { username, location, truckCapacity } = req.body;
    if (!username || !location || truckCapacity == null) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const newCollector = new Collector({ username, location, truckCapacity });
    await newCollector.save();
    res.status(201).json({ message: 'Collector registered successfully' });
  } catch (error) {
    console.error('Error registering collector:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Simulate Bin Fill + Auto Status + FullBin Logging
app.post('/api/simulate-bin-fill', async (req, res) => {
  try {
    const { username, type, weight } = req.body;
    if (!username || !type || weight == null) {
      return res.status(400).json({ error: 'Provide username, type, and weight.' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let current = 0, capacity = 0, newWeight = 0, percent = 0, status = 'Okay';

    if (type === 'Bio') {
      current = user.currentBioWeight;
      capacity = user.bioCapacity;
      if (current >= capacity) {
        return res.status(400).json({
          error: 'Bio bin is already full. Cannot add more waste.',
          status: 'Needs Pickup',
          weight: current,
          percent: ((current / capacity) * 100).toFixed(1)
        });
      }
      newWeight = current + weight;
      percent = (newWeight / capacity) * 100;
      status = percent >= 100 ? 'Needs Pickup' : 'Okay';
      user.currentBioWeight = newWeight;
      user.bioStatus = status;
    } else if (type === 'Non-Bio') {
      current = user.currentNonBioWeight;
      capacity = user.nonBioCapacity;
      if (current >= capacity) {
        return res.status(400).json({
          error: 'Non-Bio bin is already full. Cannot add more waste.',
          status: 'Needs Pickup',
          weight: current,
          percent: ((current / capacity) * 100).toFixed(1)
        });
      }
      newWeight = current + weight;
      percent = (newWeight / capacity) * 100;
      status = percent >= 100 ? 'Needs Pickup' : 'Okay';
      user.currentNonBioWeight = newWeight;
      user.nonBioStatus = status;
    } else {
      return res.status(400).json({ error: 'Invalid bin type.' });
    }

    await user.save();

    const [lat, lng] = user.location.split(',').map(Number);
    if (status === 'Needs Pickup') {
      await FullBin.updateOne(
        { username, type },
        { username, lat, lng, type },
        { upsert: true }
      );
    }

    res.json({
      message: `✅ ${type} bin updated for ${username}`,
      weight: newWeight,
      percent: percent.toFixed(1),
      status
    });
  } catch (error) {
    console.error('simulate-bin-fill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Get All Full Bins
app.get('/api/full-bins', async (req, res) => {
  try {
    const bins = await FullBin.find({});
    res.json(bins);
  } catch (error) {
    console.error('Error fetching full bins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Get User by Username
app.get('/api/get-user/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Confirm Collector Pickup
app.post('/api/pickup-confirm', async (req, res) => {
  try {
    const { binId } = req.body;
    if (!binId) return res.status(400).json({ error: 'Bin ID is required.' });

    const fullBin = await FullBin.findById(binId);
    if (!fullBin) return res.status(404).json({ error: 'Full bin not found.' });

    const user = await User.findOne({ username: fullBin.username });
    if (!user) return res.status(404).json({ error: 'Associated user not found.' });

    if (fullBin.type === 'Bio') {
      user.currentBioWeight = 0;
      user.bioStatus = 'Okay';
    } else if (fullBin.type === 'Non-Bio') {
      user.currentNonBioWeight = 0;
      user.nonBioStatus = 'Okay';
    }

    await user.save();
    await FullBin.deleteOne({ _id: binId });

    res.json({ message: `✅ ${fullBin.type} bin for ${user.username} has been cleared.` });
  } catch (error) {
    console.error('pickup-confirm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ AI Classification (Mock)
app.post('/api/classify-image', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image provided' });

    const name = file.originalname.toLowerCase();
    let waste_type = 'Unknown';
    let estimated_weight = 0.2;

    if (name.includes('plastic')) {
      waste_type = 'Plastic'; estimated_weight = 0.1;
    } else if (name.includes('banana') || name.includes('veg') || name.includes('fruit')) {
      waste_type = 'Organic'; estimated_weight = 3 + Math.random() * 2;
    } else if (name.includes('paper')) {
      waste_type = 'Paper'; estimated_weight = 0.5;
    } else if (name.includes('metal')) {
      waste_type = 'Metal'; estimated_weight = 2;
    } else if (name.includes('glass')) {
      waste_type = 'Glass'; estimated_weight = 4;
    }

    res.json({ waste_type, estimated_weight });
  } catch (error) {
    console.error('classify-image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
