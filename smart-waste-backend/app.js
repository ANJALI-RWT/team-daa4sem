// smart-waste-backend/app.js
""require('dotenv').config();
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
      currentBioWeight: 0,
      currentNonBioWeight: 0,
      bioStatus: 'Okay',
      nonBioStatus: 'Okay',
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

    let newWeight = 0;
    let capacity = 0;
    let percent = 0;
    let status = "Okay";

    if (type === 'Bio') {
      const current = user.currentBioWeight || 0;
      capacity = user.bioCapacity;
      newWeight = current + weight;
      percent = (newWeight / capacity) * 100;
      status = percent >= 100 ? 'Needs Pickup' : 'Okay';

      user.currentBioWeight = newWeight;
      user.bioStatus = status;
    } else if (type === 'Non-Bio') {
      const current = user.currentNonBioWeight || 0;
      capacity = user.nonBioCapacity;
      newWeight = current + weight;
      percent = (newWeight / capacity) * 100;
      status = percent >= 100 ? 'Needs Pickup' : 'Okay';

      user.currentNonBioWeight = newWeight;
      user.nonBioStatus = status;
    } else {
      return res.status(400).json({ error: 'Invalid bin type.' });
    }

    await user.save();

    const [lat, lng] = user.location.split(',').map(coord => parseFloat(coord.trim()));

    if (status === 'Needs Pickup') {
      await FullBin.updateOne(
        { username },
        { username, lat, lng, type },
        { upsert: true }
      );
      console.log(`📣 Notify: ${type} bin for '${username}' is full at ${user.location}`);
    }

    return res.json({
      message: `✅ ${type} bin updated for ${username}`,
      weight: newWeight,
      percent: percent.toFixed(1),
      status
    });

  } catch (error) {
    console.error('❌ simulate-bin-fill error:', error);
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
    console.error('❌ Error fetching user:', err);
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

// ✅ Confirm Collector Pickup
app.post('/api/pickup-confirm', async (req, res) => {
  try {
    const { binId } = req.body;
    if (!binId) return res.status(400).json({ error: 'Bin ID is required.' });

    const user = await User.findById(binId);
    if (!user) return res.status(404).json({ error: 'User bin not found.' });

    user.currentBioWeight = 0;
    user.currentNonBioWeight = 0;
    user.bioStatus = 'Okay';
    user.nonBioStatus = 'Okay';
    await user.save();

    await FullBin.deleteOne({ username: user.username });

    res.json({ message: `✅ Bin for ${user.username} has been cleared.` });
  } catch (error) {
    console.error('Error in pickup-confirm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Mock AI Classification
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
    console.error('❌ classify-image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
