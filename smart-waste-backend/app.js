// smart-waste-backend/app.js
require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // For handling file uploads
const path = require('path'); // Node.js built-in module for path manipulation
const fs = require('fs'); // Node.js built-in module for file system operations

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for all origins (for development)
app.use(express.json()); // Parse incoming JSON requests

// --- MongoDB Connection ---
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process if database connection fails
  });

// --- Mongoose Schemas and Models ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Added unique constraint
  location: { type: String, required: true }, // Store as string for now (e.g., "lat,long")
  bioCapacity: { type: Number, required: true, min: 0 },
  nonBioCapacity: { type: Number, required: true, min: 0 }
});

const collectorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Added unique constraint
  location: { type: String, required: true }, // Store as string for now
  truckCapacity: { type: Number, required: true, min: 1 }
});

const User = mongoose.model('User', userSchema);
const Collector = mongoose.model('Collector', collectorSchema);


// --- Multer Setup for File Uploads ---
// Configure storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    // Create the uploads directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath); // Files will be saved in the 'uploads/' directory
  },
  filename: (req, file, cb) => {
    // Generate a unique filename: fieldname-timestamp.ext
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});


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
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const newUser = new User({ username, location, bioCapacity, nonBioCapacity });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!', user: { id: newUser._id, username: newUser.username } });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error during user registration.', error: error.message });
  }
});

// Register Collector
app.post('/api/register/collector', async (req, res) => {
  try {
    const { username, location, truckCapacity } = req.body;

    if (!username || !location || truckCapacity == null) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if collector already exists
    const existingCollector = await Collector.findOne({ username });
    if (existingCollector) {
      return res.status(409).json({ message: 'Collector username already exists.' });
    }

    const newCollector = new Collector({ username, location, truckCapacity });
    await newCollector.save();
    res.status(201).json({ message: 'Collector registered successfully!', collector: { id: newCollector._id, username: newCollector.username } });
  } catch (error) {
    console.error('Error registering collector:', error);
    res.status(500).json({ message: 'Server error during collector registration.', error: error.message });
  }
});

// --- Waste Classification Endpoint (Placeholder) ---
app.post('/api/classify-waste', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided.' });
  }

  // In a real application, you would:
  // 1. Read the image file from req.file.path
  // 2. Load your TensorFlow/OpenCV model
  // 3. Preprocess the image
  // 4. Run the image through the AI model to get a prediction
  // 5. Delete the temporary file (important for cleaning up 'uploads/' directory)

  console.log('Received file:', req.file);

  // --- START Placeholder AI Logic ---
  // Simulate AI classification
  const wasteTypes = ['organic', 'plastic', 'metal', 'glass', 'paper'];
  const randomWasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
  // --- END Placeholder AI Logic ---

  // Clean up the uploaded file after processing (or if an error occurs)
  fs.unlink(req.file.path, (err) => {
    if (err) console.error('Error deleting temp file:', err);
  });

  // Return the simulated classification
  res.json({ waste_type: randomWasteType, message: 'Image classified successfully (simulated).' });
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the backend at: http://localhost:${PORT}`);
  console.log(`MongoDB URI used: ${mongoURI ? '********' : 'Not set (check .env or Render ENV)'}`);
});
