require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON requests

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

/* ------------------ Schema Definitions ------------------ */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  location: { type: String, required: true }, // format: "lat,lng"
  bioCapacity: { type: Number, required: true, min: 0 },
  nonBioCapacity: { type: Number, required: true, min: 0 },
  currentBioWeight: { type: Number, default: 0 },
  currentNonBioWeight: { type: Number, default: 0 }
});

const collectorSchema = new mongoose.Schema({
  username: { type: String, required: true },
  location: { type: String, required: true },
  truckCapacity: { type: Number, required: true, min: 1 }
});

const User = mongoose.model('User', userSchema);
const Collector = mongoose.model('Collector', collectorSchema);

/* ------------------ Routes ------------------ */

// Root test
app.get('/', (req, res) => {
  res.send('🌱 Smart Waste Management Backend is running.');
});

// 📌 Register User
app.post('/api/register/user', async (req, res) => {
  try {
    const { username, location, bioCapacity, nonBioCapacity } = req.body;

    if (!username || !location || bioCapacity == null || nonBioCapacity == null) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const newUser = new User({
      username,
      location,
      bioCapacity,
      nonBioCapacity,
      currentBioWeight: 0,
      currentNonBioWeight: 0
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

/* ------------------ Full Bin APIs ------------------ */

// ✅ GET full bins (100% full)
app.get('/api/full-bins', async (req, res) => {
  try {
    const fullUsers = await User.find({
      $or: [
        { $expr: { $gte: ["$currentBioWeight", "$bioCapacity"] } },
        { $expr: { $gte: ["$currentNonBioWeight", "$nonBioCapacity"] } }
      ]
    });

    const bins = fullUsers.map(user => {
      const [lat, lng] = user.location.split(',').map(coord => parseFloat(coord.trim()));
      return {
        id: user._id,
        lat,
        lng,
        type: user.currentBioWeight >= user.bioCapacity ? 'Bio' : 'Non-Bio'
      };
    });

    res.json(bins);
  } catch (error) {
    console.error('Error fetching full bins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ POST pickup confirmation → reset both weights to 0
app.post('/api/pickup-confirm', async (req, res) => {
  try {
    const { binId } = req.body;
    if (!binId) return res.status(400).json({ error: 'Bin ID is required.' });

    const user = await User.findById(binId);
    if (!user) return res.status(404).json({ error: 'User bin not found.' });

    user.currentBioWeight = 0;
    user.currentNonBioWeight = 0;
    await user.save();

    res.json({ message: `✅ Bin for ${user.username} has been cleared.` });
  } catch (error) {
    console.error('Error in pickup-confirm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------------ OPTIONAL: Simulate Bin Fill ------------------ */
// Simulate adding waste to a user’s bin
app.post('/api/simulate-bin-fill', async (req, res) => {
  try {
    const { username, type, weight } = req.body;
    if (!username || !type || weight == null) {
      return res.status(400).json({ error: 'Provide username, type, and weight.' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (type === 'Bio') {
      user.currentBioWeight += weight;
    } else if (type === 'Non-Bio') {
      user.currentNonBioWeight += weight;
    } else {
      return res.status(400).json({ error: 'Invalid bin type.' });
    }

    await user.save();
    res.json({ message: `Added ${weight}kg to ${type} bin for ${username}.` });
  } catch (error) {
    console.error('Error in simulate-bin-fill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------------ Server Start ------------------ */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
