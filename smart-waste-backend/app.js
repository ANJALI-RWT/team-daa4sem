// smart-waste-backend/app.js
require('dotenv').config(); // Load environment variables from .env
console.log('Mongo URI loaded:', process.env.MONGODB_URI ? '*****' : 'Not Set'); // Mask URI for security

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // ADDED: For handling file uploads
const fs = require('fs');     // ADDED: For file system operations, like deleting temp files

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse incoming JSON requests

// Set up multer for file uploads
// Files will be temporarily stored in the 'uploads/' directory
const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB Atlas
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Mongoose Schemas and Models (no changes needed here)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  location: { type: String, required: true },
  bioCapacity: { type: Number, required: true, min: 0 },
  nonBioCapacity: { type: Number, required: true, min: 0 }
});

const collectorSchema = new mongoose.Schema({
  username: { type: String, required: true },
  location: { type: String, required: true },
  truckCapacity: { type: Number, required: true, min: 1 }
});

const User = mongoose.model('User', userSchema);
const Collector = mongoose.model('Collector', collectorSchema);

// --- ROUTES ---

// Root route
app.get('/', (req, res) => {
  res.send('Smart Waste Management Backend is running.');
});

// Register User
app.post('/api/register/user', async (req, res) => {
  try {
    const { username, location, bioCapacity, nonBioCapacity } = req.body;

    if (!username || !location || bioCapacity == null || nonBioCapacity == null) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const newUser = new User({ username, location, bioCapacity, nonBioCapacity });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register Collector
app.post('/api/register/collector', async (req, res) => {
  try {
    const { username, location, truckCapacity } = req.body;

    if (!username || !location || truckCapacity == null) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const newCollector = new Collector({ username, location, truckCapacity });
    await newCollector.save();

    res.status(201).json({ message: 'Collector registered successfully', collector: newCollector });
  } catch (error) {
    console.error('Error registering collector:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Waste Classification Endpoint
// This endpoint receives an image, simulates classification, and returns a waste type.
// In a real scenario, you would integrate your AI model (e.g., a Python script using TensorFlow/OpenCV) here.
app.post('/api/classify-waste', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided.' });
  }

  console.log('Received image for classification:', req.file.originalname, `(${req.file.size} bytes)`);

  // --- Simulate AI classification ---
  const wasteTypes = ['organic', 'plastic', 'metal', 'glass', 'paper', 'cardboard', 'electronic'];
  const detectedType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];

  // --- Clean up the uploaded file ---
  // It's crucial to delete temporary files stored by multer.
  fs.unlink(req.file.path, (err) => {
    if (err) {
      console.error('Error deleting temporary uploaded file:', err);
    } else {
      console.log('Temporary file deleted:', req.file.path);
    }
  });

  res.status(200).json({ waste_type: detectedType });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
