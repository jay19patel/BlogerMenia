#!/bin/bash
set -e

echo "======================================"
echo "    Blogermenia Dummy Data Seeder     "
echo "======================================"
echo ""

echo "[1/2] Generating dummy_data.json..."
node generate_data.mjs
echo "✓ dummy_data.json created successfully."
echo ""

echo "[2/2] Seeding data into MongoDB..."
node seed.js
echo ""

echo "All done! Your database has been seeded with 10 users, 50 blogs, and 20 playlists."
echo "You can view the data in the UI."
