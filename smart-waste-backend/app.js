// smart-waste-backend/app.js
require('dotenv').config(); // Load environment variables from .env
console.log('Mongo URI loaded:', process.env.MONGODB_URI ? '*****' : 'Not Set'); // Mask URI for security

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // For handling file uploads
const fs = require('fs');     // For file system operations, like deleting temp files

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse incoming JSON requests

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB Atlas
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schemas and Models ---

// Existing User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  location: { type: String, required: true }, // Format: "latitude,longitude"
  bioCapacity: { type: Number, required: true, min: 0 },
  nonBioCapacity: { type: Number, required: true, min: 0 }
});
const User = mongoose.model('User', userSchema);

// NEW: Collector Schema (assuming you have one from previous setup or creating a placeholder)
const collectorSchema = new mongoose.Schema({
  username: { type: String, required: true },
  location: { type: String, required: true }, // "latitude,longitude"
  truckCapacity: { type: Number, required: true, min: 0 }
});
const Collector = mongoose.model('Collector', collectorSchema);


// NEW: Bin Schema
// This schema will represent individual bins and their fill levels
const binSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to the user who owns the bin
  binType: { type: String, required: true, enum: ['bio', 'nonBio'] }, // 'bio' or 'nonBio'
  currentFill: { type: Number, required: true, default: 0, min: 0, max: 100 }, // Percentage fill
  maxCapacity: { type: Number, required: true, min: 0 }, // Max capacity in kg (from user registration)
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  isFull: { type: Boolean, default: false }, // True if currentFill >= 100
  lastCollected: { type: Date, default: null },
  lastUpdated: { type: Date, default: Date.now }
});
const Bin = mongoose.model('Bin', binSchema);

// --- ROUTES ---

// Root route
app.get('/', (req, res) => {
  res.send('Smart Waste Management Backend is running.');
});

// MODIFIED: Register User
// Now creates default bins for the new user upon registration
app.post('/api/register/user', async (req, res) => {
  try {
    const { username, location, bioCapacity, nonBioCapacity } = req.body;

    if (!username || !location || bioCapacity == null || nonBioCapacity == null) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const newUser = new User({ username, location, bioCapacity, nonBioCapacity });
    await newUser.save();

    // Parse location string into lat/lng numbers for bin
    const [latitude, longitude] = location.split(',').map(Number);
    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn(`Invalid location format for user ${username}: ${location}`);
      // Proceed without bin creation if location is bad, or return error
      return res.status(400).json({ error: 'Invalid location format. Please ensure it\'s "latitude,longitude".' });
    }

    // Create default bins for the new user
    const bioBin = new Bin({
      userId: newUser._id,
      binType: 'bio',
      maxCapacity: bioCapacity,
      location: { latitude, longitude },
      currentFill: 0, // Start empty
      isFull: false
    });
    const nonBioBin = new Bin({
      userId: newUser._id,
      binType: 'nonBio',
      maxCapacity: nonBioCapacity,
      location: { latitude, longitude },
      currentFill: 0, // Start empty
      isFull: false
    });

    await Promise.all([bioBin.save(), nonBioBin.save()]);

    res.status(201).json({ message: 'User registered successfully', user: newUser._id, bioBinId: bioBin._id, nonBioBinId: nonBioBin._id }); // Return user and bin IDs
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register Collector (no changes needed here)
app.post('/api/register/collector', async (req, res) => {
  try {
    const { username, location, truckCapacity } = req.body;

    if (!username || !location || truckCapacity == null) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const newCollector = new Collector({ username, location, truckCapacity });
    await newCollector.save();

    res.status(201).json({ message: 'Collector registered successfully', collectorId: newCollector._id }); // Return just collector ID
  } catch (error) {
    console.error('Error registering collector:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MODIFIED: Waste Classification Endpoint
// Now updates the actual bin fill level in MongoDB
app.post('/api/classify-waste', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided.' });
  }

  // Frontend should send userId and binType to update the correct bin
  const { userId, binType } = req.body; // Expecting userId and binType from frontend
  if (!userId || !binType) {
    fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting temp file:', err); });
    return res.status(400).json({ message: 'User ID and Bin Type are required for bin update.' });
  }

  console.log('Received image for classification:', req.file.originalname, `(${req.file.size} bytes)`);

  // --- Simulate AI classification ---
  const wasteTypes = ['organic', 'plastic', 'metal', 'glass', 'paper', 'cardboard', 'electronic'];
  const detectedType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)]; // Simulated

  // --- Simulate volume impact based on detectedType ---
  // These are illustrative values. You'd refine them based on real data.
  const volumeImpactMap = {
    'organic': 8,
    'plastic': 5,
    'metal': 3,
    'glass': 4,
    'paper': 6,
    'cardboard': 7,
    'electronic': 10
  };
  const simulatedVolumeIncrease = volumeImpactMap[detectedType] || 5; // Default if type not in map


  // --- Update the actual bin in MongoDB ---
  try {
    const bin = await Bin.findOne({ userId: userId, binType: binType });

    if (!bin) {
      fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting temp file:', err); });
      return res.status(404).json({ message: 'Bin not found for this user and type.' });
    }

    bin.currentFill = Math.min(100, bin.currentFill + simulatedVolumeIncrease);
    bin.isFull = bin.currentFill >= 100;
    bin.lastUpdated = Date.now();
    await bin.save();

    console.log(`Bin ${bin._id} (${binType}) updated for user ${userId}. New fill: ${bin.currentFill}%, Is Full: ${bin.isFull}`);

    // Clean up the uploaded file
    fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting temp file:', err); });

    res.status(200).json({ waste_type: detectedType, binUpdated: true, newFill: bin.currentFill, isFull: bin.isFull });

  } catch (error) {
    console.error('Error updating bin fill level:', error);
    fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting temp file:', err); });
    res.status(500).json({ error: 'Internal server error during bin update.' });
  }
});


// NEW: Get Full Bins for Collector
// Returns all bins that are marked as 100% full
app.get('/api/full-bins', async (req, res) => {
  try {
    // Only return bins where isFull is true
    const fullBins = await Bin.find({ isFull: true }).select('location binType currentFill _id userId'); // Select specific fields for privacy

    // You can optionally sort by distance to collector here on backend,
    // but often it's done on frontend for immediate map interaction.
    // For now, let's keep it simple and just return the list.

    res.status(200).json(fullBins);
  } catch (error) {
    console.error('Error fetching full bins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Confirm Pickup and Reset Bin
app.post('/api/pickup-confirm', async (req, res) => {
  const { binId, collectorId } = req.body; // collectorId is optional for logging

  if (!binId) {
    return res.status(400).json({ message: 'Bin ID is required for pickup confirmation.' });
  }

  try {
    const bin = await Bin.findById(binId);

    if (!bin) {
      return res.status(404).json({ message: 'Bin not found.' });
    }

    bin.currentFill = 0; // Reset fill level
    bin.isFull = false;  // Mark as not full
    bin.lastCollected = Date.now(); // Record collection time
    // You could also add to a separate collection log here
    await bin.save();

    console.log(`Bin ${binId} collected by ${collectorId || 'unknown'}. Reset to 0%.`);

    res.status(200).json({ message: 'Bin collected and reset successfully!', binId: binId });

  } catch (error) {
    console.error('Error confirming pickup:', error);
    res.status(500).json({ error: 'Internal server error during pickup confirmation.' });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
