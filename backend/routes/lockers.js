const express = require("express");
const Locker = require("../models/Locker");

const router = express.Router();

// Get all available lockers
router.get("/", async (req, res) => {
  try {
    const lockers = await Locker.find({ status: "available" });
    res.status(200).json(lockers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get details of a specific locker
router.get("/:id", async (req, res) => {
  try {
    const locker = await Locker.findById(req.params.id);
    if (!locker) return res.status(404).json({ error: "Locker not found" });
    res.status(200).json(locker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rent a locker
router.post("/:id/rent", async (req, res) => {
  try {
    const locker = await Locker.findById(req.params.id);
    if (!locker || locker.status !== "available") {
      return res.status(400).json({ error: "Locker is not available" });
    }

    // Simulate the rental process
    locker.status = "rented";
    await locker.save();

    res.status(200).json({ message: "Locker rented successfully", locker });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
