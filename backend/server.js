// Import required modules
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const lockerRoutes = require("./routes/lockers");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
console.log("Connecting to MongoDB:", MONGO_URI);

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/lockers", lockerRoutes);

// Define additional routes (e.g., for registration)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Incoming registration request:", req.body);

    // Validate request body
    if (!email || !password) {
      console.log("Validation failed: Missing required fields.");
      return res
        .status(400)
        .json({ message: "Email, and password are required." });
    }

    // Simulate database logic
    console.log(`Registering user: (${email})`);

    // Replace this with actual database logic (e.g., using Mongoose to save user)
    // Example:
    // const user = new User({ email, password });
    // await user.save();

    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
