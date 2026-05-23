#!/bin/bash
set -e

echo "======================================"
echo "    Blogermenia Dummy Data Seeder     "
echo "======================================"
echo ""

echo "[1/2] Generating dummy_data.json..."
node generate_data.mjs
echo "[2/2] Setting up local images..."
mkdir -p ../frontend/public/uploads
cp blog.png playlist.png profile.png ../frontend/public/uploads/
echo "✓ Images copied to frontend/public/uploads."
echo ""

echo "[3/3] Seeding data into MongoDB..."
node seed.js
echo ""

echo "All done! Your database has been seeded with 10 users, 50 blogs, and 20 playlists."
echo "You can view the data in the UI."
