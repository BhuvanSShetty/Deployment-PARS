import mongoose from "mongoose";
import dotenv from "dotenv";
import FirstResponder from "./src/models/firstResponder.js";

dotenv.config();

// Bengaluru center coordinates for synthetic data generation
const BENGALURU_CENTER_LAT = 12.9716;
const BENGALURU_CENTER_LNG = 77.5946;

// Function to generate random location around Bengaluru (within ~10km radius)
function generateRandomLocation() {
  const r = 10000 / 111300; // ~10km radius
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  
  // Adjust the x-coordinate for the shrinking of the east-west distances
  const num_x = x / Math.cos(BENGALURU_CENTER_LAT * Math.PI / 180);

  return {
    lat: BENGALURU_CENTER_LAT + y,
    lng: BENGALURU_CENTER_LNG + num_x
  };
}

const mockNames = [
  "Dr. Anand R.", "Priya M.", "Kiran Kumar", "Dr. Seema Patil", "Ramesh S.", 
  "Anita Desai", "Suresh V.", "Dr. Vikram K.", "Kavita Reddy", "Arun Bhat"
];
const roles = ["cardiologist", "paramedic", "nurse", "doctor", "bls_trained"];
const skillSets = [
  ["defib", "CPR", "BLS"],
  ["ACLS", "intubation", "IV_access", "defib"],
  ["first_aid", "CPR", "bleeding_control"],
  ["trauma_care", "airway_management"]
];

const generateResponders = (count = 40) => {
  const responders = [];
  for (let i = 0; i < count; i++) {
    const loc = generateRandomLocation();
    const role = roles[Math.floor(Math.random() * roles.length)];
    responders.push({
      responderId: `FR-${String(100 + i).padStart(3, '0')}`,
      name: mockNames[i % mockNames.length] + (i >= mockNames.length ? ` ${Math.floor(i/10)}` : ""),
      role: role,
      skills: skillSets[Math.floor(Math.random() * skillSets.length)],
      carriesKit: Math.random() > 0.3, // 70% carry kits
      currentLocation: {
        type: "Point",
        coordinates: [loc.lng, loc.lat]
      },
      status: "available",
      casesResponded: Math.floor(Math.random() * 20),
      averageResponseAcceptRate: 0.75 + (Math.random() * 0.25)
    });
  }
  return responders;
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    await FirstResponder.deleteMany({});
    console.log("Cleared existing first responders");

    const data = generateResponders(40);
    await FirstResponder.insertMany(data);
    
    console.log(`Successfully seeded ${data.length} first responders!`);
    mongoose.connection.close();
  } catch (err) {
    console.error("Error seeding data:", err);
    process.exit(1);
  }
}

seed();
