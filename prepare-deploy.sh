#!/bin/bash

# Script untuk persiapan deploy ke Railway

echo "🚀 Preparing Pinjam Kuy for Railway Deploy..."

# 1. Generate VAPID Keys
echo ""
echo "📧 Generating VAPID Keys for Push Notifications..."
cd be-pinjam-rev-main
node generate-secrets.js
echo ""

# 2. Check dependencies
echo "📦 Checking dependencies..."
cd ..
npm install
cd be-pinjam-rev-main
npm install

# 3. Build frontend
echo "🏗️  Building frontend..."
cd ..
npm run build

echo ""
echo "✅ Project ready for deploy!"
echo ""
echo "Next steps:"
echo "1. Create MySQL database di Railway"
echo "2. Deploy backend dari GitHub"
echo "3. Set environment variables (lihat .env.railway.example)"
echo "4. Deploy frontend ke Vercel"
echo "5. Update CORS origins di server.js"
echo ""
echo "📖 Baca DEPLOY_RAILWAY.md untuk panduan lengkap"
