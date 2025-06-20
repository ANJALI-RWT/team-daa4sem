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
  username: { type: String, required: true, unique: true }, // Added unique: true
  location: { type: String, required: true }, // "lat,lng"
  bioCapacity: { type: Number, required: true, min: 0 },
  nonBioCapacity: { type: Number, required: true, min: 0 },
  currentBioWeight: { type: Number, default: 0 },
  currentNonBioWeight: { type: Number, default: 0 },
  bioStatus: { type: String, default: 'Okay' },
  nonBioStatus: { type: String, default: 'Okay' },
  zone: { type: String, default: 'Zone A' } // Default zone can be useful
});

const collectorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Added unique: true
  location: { type: String, required: true },
  truckCapacity: { type: Number, required: true, min: 1 }
});

const fullBinSchema = new mongoose.Schema({
  username: { type: String, required: true },
  lat: Number,
  lng: Number,
  type: { type: String, required: true }, // 'Bio' or 'Non-Bio'
  timestamp: { type: Date, default: Date.now } // When the bin was marked full
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

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists. Please choose a different one.' });
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
    res.status(500).json({ error: 'Server error during user registration.' });
  }
});

// 📌 Register Collector
app.post('/api/register/collector', async (req, res) => {
  try {
    const { username, location, truckCapacity } = req.body;
    if (!username || !location || truckCapacity == null) {
      return res.status(400).json({ error: 'All fields required.' });
    }

    const existingCollector = await Collector.findOne({ username });
    if (existingCollector) {
      return res.status(409).json({ error: 'Username already exists. Please choose a different one.' });
    }

    const newCollector = new Collector({ username, location, truckCapacity });
    await newCollector.save();
    res.status(201).json({ message: 'Collector registered successfully.' });
  } catch (err) {
    console.error('Register Collector Error:', err);
    res.status(500).json({ error: 'Server error during collector registration.' });
  }
});

// ✅ Simulate Bin Fill with Overflow Prevention
app.post('/api/simulate-bin-fill', async (req, res) => {
  try {
    const { username, type, weight } = req.body;
    if (!username || !type || weight == null || isNaN(weight) || weight < 0) {
      return res.status(400).json({ error: 'Missing or invalid username/type/weight.' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let current = 0, capacity = 0;
    let updateFieldCurrent = '';
    let updateFieldStatus = '';

    if (type === 'Bio') {
      current = user.currentBioWeight;
      capacity = user.bioCapacity;
      updateFieldCurrent = 'currentBioWeight';
      updateFieldStatus = 'bioStatus';
    } else if (type === 'Non-Bio') {
      current = user.currentNonBioWeight;
      capacity = user.nonBioCapacity;
      updateFieldCurrent = 'currentNonBioWeight';
      updateFieldStatus = 'nonBioStatus';
    } else {
      return res.status(400).json({ error: 'Invalid bin type. Must be "Bio" or "Non-Bio".' });
    }

    // Crucial check: Prevent adding anything if the bin is already at or beyond capacity
    if (current >= capacity) {
      return res.status(400).json({
        error: `${type} bin is already full.`,
        status: 'Needs Pickup', // Backend confirms it needs pickup
        weight: current.toFixed(1),
        percent: ((current / capacity) * 100).toFixed(1)
      });
    }

    // Cap the new weight at the bin's capacity
    const newWeight = Math.min(current + weight, capacity);
    const percent = (newWeight / capacity) * 100;
    // Set status based on new weight relative to capacity
    const status = (newWeight >= capacity) ? 'Needs Pickup' : 'Okay';

    // Update user document
    user[updateFieldCurrent] = newWeight;
    user[updateFieldStatus] = status;

    await user.save();

    const [lat, lng] = user.location.split(',').map(Number);

    // If the bin is now full, log it in the FullBin collection
    if (status === 'Needs Pickup') {
      await FullBin.updateOne(
        { username, type }, // Find by username and bin type
        { username, lat, lng, type, timestamp: new Date() }, // Update or insert
        { upsert: true } // Create if not exists
      );
      console.log(`📍 Logged full ${type} bin for ${username} at ${lat},${lng}.`);
    } else {
        // If it was previously marked as Needs Pickup but now isn't (e.g., if capacity was increased or weight reduced),
        // remove it from FullBin, though this scenario is less common for "add waste"
        await FullBin.deleteOne({ username, type });
    }


    res.json({
      message: `${type} bin updated successfully.`,
      weight: newWeight.toFixed(1),
      percent: percent.toFixed(1),
      status
    });

  } catch (err) {
    console.error('Simulate Bin Fill Error:', err);
    res.status(500).json({ error: 'Server error during bin fill simulation.' });
  }
});

// ✅ Full Bins Listing - Get all bins marked as "Needs Pickup"
app.get('/api/full-bins', async (req, res) => {
  try {
    const bins = await FullBin.find({}); // Find all entries in FullBin collection
    res.json(bins);
  } catch (err) {
    console.error('Full Bins Listing Error:', err);
    res.status(500).json({ error: 'Server error fetching full bins.' });
  }
});

// ✅ Pickup Confirm - Reset bin weight and remove from full bins list
app.post('/api/pickup-confirm', async (req, res) => {
  try {
    const { binId } = req.body; // binId is the _id from the FullBin document
    if (!binId) return res.status(400).json({ error: 'Bin ID is required.' });

    const fullBinEntry = await FullBin.findById(binId);
    if (!fullBinEntry) return res.status(404).json({ error: 'Full bin entry not found in records.' });

    const user = await User.findOne({ username: fullBinEntry.username });
    if (!user) {
        // This case indicates a data inconsistency, log it but proceed to delete FullBin entry
        console.warn(`User ${fullBinEntry.username} not found for full bin entry ${binId}.`);
        await FullBin.deleteOne({ _id: binId }); // Clean up the invalid full bin entry
        return res.status(404).json({ error: 'Associated user not found. Bin cleared from full list.' });
    }

    if (fullBinEntry.type === 'Bio') {
      user.currentBioWeight = 0; // Reset bio bin
      user.bioStatus = 'Okay';
    } else if (fullBinEntry.type === 'Non-Bio') {
      user.currentNonBioWeight = 0; // Reset non-bio bin
      user.nonBioStatus = 'Okay';
    } else {
        // This case also indicates data inconsistency, or an invalid 'type' in FullBin
        console.warn(`Invalid bin type '${fullBinEntry.type}' for full bin entry ${binId}.`);
        await FullBin.deleteOne({ _id: binId }); // Clean up
        return res.status(400).json({ error: 'Invalid bin type recorded. Bin cleared from full list.' });
    }

    await user.save(); // Save updated user bin status
    await FullBin.deleteOne({ _id: binId }); // Remove the bin from the full list

    res.json({ message: `✅ ${fullBinEntry.type} bin for ${user.username} has been cleared.` });
  } catch (err) {
    console.error('Pickup Confirm Error:', err);
    res.status(500).json({ error: 'Server error during pickup confirmation.' });
  }
});

// ✅ User Bin Status - Get a specific user's bin details
app.get('/api/get-user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('Get User Error:', err);
    res.status(500).json({ error: 'Server error fetching user data.' });
  }
});

// ✅ AI Waste Classification (Mock) - Simulates AI returning waste type and weight
app.post('/api/classify-image', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image provided.' });

    const name = file.originalname.toLowerCase();
    let waste_type = 'Unknown';
    let estimated_weight = 0.2; // Default small weight for unknown

    // Simple mock logic based on filename for demonstration
    if (name.includes('plastic')) {
      waste_type = 'Plastic'; estimated_weight = 0.1;
    } else if (name.includes('banana') || name.includes('fruit') || name.includes('veg') || name.includes('organic')) {
      waste_type = 'Organic'; estimated_weight = 0.5 + Math.random() * 0.5; // Organic items can vary
    } else if (name.includes('paper')) {
      waste_type = 'Paper'; estimated_weight = 0.3;
    } else if (name.includes('metal')) {
      waste_type = 'Metal'; estimated_weight = 1.0;
    } else if (name.includes('glass')) {
      waste_type = 'Glass'; estimated_weight = 2.0;
    } else if (name.includes('cardboard')) {
      waste_type = 'Paper'; estimated_weight = 0.7;
    }

    // Simulate a small delay for "AI processing"
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    res.json({ waste_type, estimated_weight: parseFloat(estimated_weight.toFixed(2)) });
  } catch (err) {
    console.error('Classify Image Error:', err);
    res.status(500).json({ error: 'Server error during image classification.' });
  }
});

// ✅ Barcode Lookup (Mock) - Simulates looking up a barcode for waste type and weight
app.post('/api/lookup-barcode', async (req, res) => {
  try {
    const { barcode } = req.body;
    if (!barcode) return res.status(400).json({ error: 'Barcode is required.' });

    let waste_type = 'Unknown';
    let estimated_weight = 0.2; // Default weight

    // Simple mock logic based on barcode prefix
    if (barcode.startsWith('123')) {
      waste_type = 'Plastic'; estimated_weight = 0.15; // Example weight for plastic bottle
    } else if (barcode.startsWith('456')) {
      waste_type = 'Paper'; estimated_weight = 0.3; // Example weight for a paper box
    } else if (barcode.startsWith('789')) {
      waste_type = 'Metal'; estimated_weight = 0.7; // Example weight for a can
    } else if (barcode.startsWith('901')) {
      waste_type = 'Organic'; estimated_weight = 0.8; // Example for food packaging that might be organic
    }

    // Simulate a small delay for "database lookup"
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

    res.json({ waste_type, estimated_weight: parseFloat(estimated_weight.toFixed(2)) });
  } catch (err) {
    console.error('Barcode Lookup Error:', err);
    res.status(500).json({ error: 'Server error during barcode lookup.' });
  }
});


// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
