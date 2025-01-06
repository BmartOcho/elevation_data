const mongoose = require("mongoose");
const Locker = require("./models/Locker");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("Connected to MongoDB");

    // Clear existing data
    await Locker.deleteMany({});

    // Add sample lockers
    const lockers = [
      { location: "Downtown", equipment: ["Helmet", "Bike"], status: "available" },
      { location: "Airport", equipment: ["Luggage Cart"], status: "available" },
      { location: "Mall", equipment: ["Stroller"], status: "rented" },
    ];
    await Locker.insertMany(lockers);

    console.log("Seed data added");
    mongoose.disconnect();
  })
  .catch((err) => console.log(err));
