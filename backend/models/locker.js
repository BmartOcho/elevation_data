const mongoose = require("mongoose");

const LockerSchema = new mongoose.Schema({
  location: { type: String, required: true },
  equipment: { type: [String], required: true }, // Array of equipment names
  status: { type: String, default: "available" }, // "available" or "rented"
});

module.exports = mongoose.model("Locker", LockerSchema);
