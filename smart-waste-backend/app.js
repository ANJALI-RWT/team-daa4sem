# smart-waste-backend/app.py
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // For handling file uploads

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Temporary directory for uploaded images

// Connect to MongoDB Atlas
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Mongoose Schemas and Models
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
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const newUser = new User({ username, location, bioCapacity, nonBioCapacity });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!', user: newUser });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(
