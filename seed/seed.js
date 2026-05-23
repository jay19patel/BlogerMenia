const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// We can read from .env.local if needed, but hardcoding for simplicity based on the known URI
const MONGODB_URI = "mongodb://admin:password@localhost:27017";

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Read dummy_data.json from the current directory
  const dataPath = path.join(__dirname, 'dummy_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error("dummy_data.json not found! Please run generate_data.mjs first.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`Loaded ${data.users.length} users, ${data.blogs.length} blogs, and ${data.playlists.length} playlists from JSON.`);

  // Prepare data with correct ObjectIds and Dates
  const users = data.users.map(u => ({
    ...u,
    _id: new mongoose.Types.ObjectId(u._id),
    password: bcrypt.hashSync(u.password, 10),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const blogs = data.blogs.map(b => ({
    ...b,
    _id: new mongoose.Types.ObjectId(b._id),
    author: new mongoose.Types.ObjectId(b.author),
    publishedDate: new Date(b.publishedDate),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const playlists = data.playlists.map(p => ({
    ...p,
    _id: new mongoose.Types.ObjectId(p._id),
    owner: new mongoose.Types.ObjectId(p.owner),
    blogs: p.blogs.map(bid => new mongoose.Types.ObjectId(bid)),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Direct insertions bypassing mongoose schema validation to avoid import issues
  const db = mongoose.connection.db;

  console.log("Clearing existing users, blogs, and playlists...");
  await db.collection('users').deleteMany({});
  await db.collection('blogs').deleteMany({});
  await db.collection('playlists').deleteMany({});

  console.log("Inserting users...");
  await db.collection('users').insertMany(users);
  
  console.log("Inserting blogs...");
  await db.collection('blogs').insertMany(blogs);
  
  console.log("Inserting playlists...");
  await db.collection('playlists').insertMany(playlists);

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
