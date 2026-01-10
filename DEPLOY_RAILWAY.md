# Panduan Deploy Pinjam Kuy ke Railway

## Persiapan

### 1. Daftar Akun Railway
- Buka https://railway.app
- Sign up dengan GitHub account
- Verifikasi email

### 2. Install Railway CLI (Opsional)
```bash
npm install -g @railway/cli
railway login
```

## Deploy Database MySQL

### 1. Buat MySQL Database
- Di Railway Dashboard, klik **"+ New"**
- Pilih **"Database"** → **"Add MySQL"**
- Tunggu provisioning selesai

### 2. Copy Connection Details
Setelah database ready, klik database → **"Connect"** → Copy info:
```
MYSQLHOST=<hostname>
MYSQLPORT=<port>
MYSQLUSER=root
MYSQLDATABASE=railway
MYSQLPASSWORD=<password>
```

### 3. Import Database Schema
```bash
# Download schema dari project
# Upload via MySQL client atau Railway MySQL console
# File: sql/pinjam-kuy-full-schema.sql
```

Atau via Railway web console:
- Klik database → **"Data"** → **"Query"**
- Paste & run SQL schema

## Deploy Backend (Node.js)

### 1. Push ke GitHub
```bash
cd be-pinjam-rev-main
git init
git add .
git commit -m "Initial commit for Railway deploy"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Deploy dari GitHub
- Di Railway Dashboard, klik **"+ New"**
- Pilih **"Deploy from GitHub repo"**
- Select repository & folder `be-pinjam-rev-main`
- Railway akan auto-detect Node.js

### 3. Set Environment Variables
Klik service backend → **"Variables"** → Add:

```env
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
JWT_SECRET=pinjamkuysecretkey-change-in-production
VAPID_PUBLIC_KEY=BGhFvr-14LSm6KqdJlcEZkBJ9DgPEjUoMG8i5cAbAw2wjnoOgqajf_8qUx0ibxd6hACUhySSoh-cxLPAUfY9Tfw
VAPID_PRIVATE_KEY=<generate-new-vapid-key>
NODE_ENV=production
PORT=5000
```

**Generate VAPID Keys:**
```bash
cd be-pinjam-rev-main
node generate-secrets.js
# Copy output keys
```

### 4. Generate Domain
- Klik **"Settings"** → **"Networking"**
- Klik **"Generate Domain"**
- Copy URL: `https://your-backend.railway.app`

## Deploy Frontend (React)

### Option A: Vercel (Recommended)

**1. Install Vercel CLI**
```bash
npm install -g vercel
```

**2. Deploy**
```bash
cd pinjam-kuy-gabung-final
vercel
```

**3. Set Environment Variable**
Saat deploy, set:
```
REACT_APP_API_BASE_URL=https://your-backend.railway.app/api
```

### Option B: Railway Static Site

**1. Build Frontend**
```bash
npm run build
```

**2. Deploy build folder**
- Klik **"+ New"** → **"Empty Service"**
- Upload `build/` folder
- Railway akan serve sebagai static site

## Post-Deploy Configuration

### 1. Update CORS di Backend
Edit `be-pinjam-rev-main/server.js`:
```javascript
const allowedOrigins = [
  'https://your-frontend.vercel.app',
  'http://localhost:3000' // untuk testing
];
```

### 2. Test Endpoints
```bash
# Test backend
curl https://your-backend.railway.app/api/books

# Test frontend
open https://your-frontend.vercel.app
```

### 3. Setup Cloudinary (untuk upload gambar)
- Daftar di https://cloudinary.com
- Copy credentials
- Add ke Railway Variables:
```env
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

## Troubleshooting

### Database Connection Error
- Pastikan environment variables benar
- Check Railway MySQL status
- Test connection string

### CORS Error
- Update allowedOrigins di server.js
- Redeploy backend

### Build Error
- Check Node.js version (gunakan v18+)
- Run `npm install` locally dulu
- Check build logs di Railway

### 502 Bad Gateway
- Check backend logs di Railway
- Pastikan port correct (5000)
- Check database connection

## Monitoring

### Logs
- Railway Dashboard → Service → **"Deployments"** → **"View Logs"**

### Metrics
- Railway Dashboard → Service → **"Metrics"**
- Monitor CPU, Memory, Network

## Update & Redeploy

### Auto Deploy (GitHub)
- Push ke main branch
- Railway auto-redeploy

### Manual Deploy
```bash
railway up
```

## Biaya

### Railway Free Tier
- $5 credit/month
- Cukup untuk:
  - 1 Backend service
  - 1 MySQL database
  - ~500MB storage
  
### Upgrade jika perlu
- Hobby plan: $5/month
- Pro plan: $20/month

## Backup Database

### Export via Railway
```bash
railway run mysqldump -u root -p$MYSQLPASSWORD railway > backup.sql
```

### Schedule Backup
- Setup cron job atau Railway cron
- Export ke cloud storage

## Security Checklist

- [ ] Change JWT_SECRET di production
- [ ] Generate new VAPID keys
- [ ] Setup HTTPS (Railway auto SSL)
- [ ] Enable rate limiting
- [ ] Update CORS origins
- [ ] Remove console.logs sensitif
- [ ] Setup monitoring/alerts

## Support

- Railway Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Forum: https://help.railway.app

---

**Project Ready untuk Deploy!** 🚀
Ikuti langkah di atas step-by-step.
