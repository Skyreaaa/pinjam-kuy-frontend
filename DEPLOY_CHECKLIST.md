# Railway Deploy Checklist

## Pre-Deploy

- [ ] Test app locally (frontend + backend)
- [ ] Check semua environment variables
- [ ] Generate new VAPID keys untuk production
- [ ] Generate strong JWT_SECRET
- [ ] Setup Cloudinary account (untuk upload)
- [ ] Backup database lokal

## Database Setup

- [ ] Create MySQL database di Railway
- [ ] Copy connection details
- [ ] Import schema SQL
- [ ] Test connection

## Backend Deploy

- [ ] Push code ke GitHub
- [ ] Deploy dari GitHub di Railway
- [ ] Set environment variables
- [ ] Generate domain
- [ ] Test API endpoints
- [ ] Check logs untuk errors

## Frontend Deploy

- [ ] Update API_BASE_URL ke Railway backend
- [ ] Build frontend (`npm run build`)
- [ ] Deploy ke Vercel
- [ ] Test semua halaman
- [ ] Test login/register
- [ ] Test upload gambar

## Post-Deploy

- [ ] Update CORS origins di backend
- [ ] Test push notifications
- [ ] Test Socket.IO real-time features
- [ ] Setup monitoring
- [ ] Document production URLs

## Production URLs

Backend: https://______________________.railway.app
Frontend: https://______________________.vercel.app
Database: Railway MySQL (internal)

## Important Notes

- Railway free tier: $5 credit/month
- Vercel free tier: Unlimited untuk personal projects
- Monitor usage di dashboard
- Setup alerts untuk downtime
- Regular database backups

## Support Contacts

Railway: https://railway.app/help
Vercel: https://vercel.com/support
