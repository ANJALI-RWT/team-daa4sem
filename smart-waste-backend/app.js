require('dotenv').config();
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

// 🌱 Root
app.get('/', (req, res) => {
  res.send('🌿 Smart Waste Management API Running.');
});

// 📌 Register User
app.post('/api/register/user', async (req, res) => {
  try {
    const { username, location, bioCapacity, nonBioCapacity, zone } = req.body;
    if (!username || !location || bioCapacity == null || nonBioCapacity == null) {
      return res.status(400).json({ error: 'All fields required.' });
    }

    const newUser = new User({
      username,
      location,
      bioCapacity,
      nonBioCapacity,
      zone: zone || 'Zone A'
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    console.error('Register User Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 📌 Register Collector
app.post('/api/register/collector', async (req, res) => {
  try {
    const { username, location, truckCapacity } = req.body;
    if (!username || !location || truckCapacity == null) {
      return res.status(400).json({ error: 'All fields required.' });
    }

    const newCollector = new Collector({ username, location, truckCapacity });
    await newCollector.save();
    res.status(201).json({ message: 'Collector registered successfully.' });
  } catch (err) {
    console.error('Register Collector Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Simulate Bin Fill with Overflow Prevention
app.post('/api/simulate-bin-fill', async (req, res) => {
  try {
    const { username, type, weight } = req.body;
    if (!username || !type || weight == null) {
      return res.status(400).json({ error: 'Missing username/type/weight' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let current = 0, capacity = 0;

    if (type === 'Bio') {
      current = user.currentBioWeight;
      capacity = user.bioCapacity;
    } else if (type === 'Non-Bio') {
      current = user.currentNonBioWeight;
      capacity = user.nonBioCapacity;
    } else {
      return res.status(400).json({ error: 'Invalid bin type' });
    }

    if (current >= capacity) {
      return res.status(400).json({
        error: `${type} bin is already full.`,
        status: 'Needs Pickup',
        weight: current,
        percent: ((current / capacity) * 100).toFixed(1)
      });
    }

    const newWeight = current + weight;
    const percent = (newWeight / capacity) * 100;
    const status = percent >= 100 ? 'Needs Pickup' : 'Okay';

    if (type === 'Bio') {
      user.currentBioWeight = newWeight;
      user.bioStatus = status;
    } else {
      user.currentNonBioWeight = newWeight;
      user.nonBioStatus = status;
    }

    await user.save();

    const [lat, lng] = user.location.split(',').map(Number);

    if (status === 'Needs Pickup') {
      await FullBin.updateOne(
        { username, type },
        { username, lat, lng, type },
        { upsert: true }
      );
      console.log(`📍 Logged full ${type} bin for ${username}`);
    }

    res.json({
      message: `${type} bin updated`,
      weight: newWeight,
      percent: percent.toFixed(1),
      status
    });

  } catch (err) {
    console.error('simulate-bin-fill error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Full Bins Listing
app.get('/api/full-bins', async (req, res) => {
  try {
    const bins = await FullBin.find();
    res.json(bins);
  } catch (err) {
    console.error('full-bins error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Pickup Confirm
app.post('/api/pickup-confirm', async (req, res) => {
  try {
    const { binId } = req.body;
    if (!binId) return res.status(400).json({ error: 'Bin ID is required.' });

    const fullBin = await FullBin.findById(binId);
    if (!fullBin) return res.status(404).json({ error: 'Bin not found.' });

    const user = await User.findOne({ username: fullBin.username });
    if (!user) return res.status(404).json({ error: 'User not found.' });

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
  } catch (err) {
    console.error('pickup-confirm error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ User Bin Status
app.get('/api/get-user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('get-user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ AI Waste Classification (Mock)
app.post('/api/classify-image', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image provided' });

    const name = file.originalname.toLowerCase();
    let waste_type = 'Unknown';
    let estimated_weight = 0.2;

    if (name.includes('plastic')) {
      waste_type = 'Plastic'; estimated_weight = 0.1;
    } else if (name.includes('banana') || name.includes('fruit') || name.includes('veg')) {
      waste_type = 'Organic'; estimated_weight = 2 + Math.random() * 2;
    } else if (name.includes('paper')) {
      waste_type = 'Paper'; estimated_weight = 0.5;
    } else if (name.includes('metal')) {
      waste_type = 'Metal'; estimated_weight = 1.5;
    } else if (name.includes('glass')) {
      waste_type = 'Glass'; estimated_weight = 3.5;
    }

    res.json({ waste_type, estimated_weight });
  } catch (err) {
    console.error('classify-image error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
