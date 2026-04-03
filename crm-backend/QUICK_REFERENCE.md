# 🚀 Quick Reference - Render Deployment

## Essential URLs
- **Render Dashboard:** https://dashboard.render.com
- **MongoDB Atlas:** https://cloud.mongodb.com
- **Backend URL:** https://parnetscrm.onrender.com
- **Frontend URL:** https://parnetscrm.netlify.app

## Quick Commands

### Test Backend Health
```bash
curl https://parnetscrm.onrender.com/api/health
```

### Test Email Service
```bash
curl https://parnetscrm.onrender.com/api/test-email
```

### Local Development
```bash
cd crm-backend
npm install
npm run dev
```

## Environment Variables (Copy-Paste for Render)

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://parnetstech13:parnetstech13@cluster0.svfj4.mongodb.net/crm-system?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=parnets-crm-jwt-secret-key-2026-production-secure
JWT_REFRESH_SECRET=parnets-crm-refresh-secret-key-2026-production-secure
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://parnetscrm.netlify.app
SUPER_ADMIN_EMAIL=parnetstech13@gmail.com
SUPER_ADMIN_PASSWORD=admin123
SUPER_ADMIN_NAME=Super Admin
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=parnetstech13@gmail.com
SMTP_PASS=exyvgkbewecximlw
SMTP_FROM_NAME=Parnets CRM
```

## Render Service Settings

```
Name: parnets-crm-backend
Region: Singapore
Branch: main
Root Directory: crm-backend
Environment: Node
Build Command: npm install
Start Command: node server.js
Plan: Free (or Starter)
```

## MongoDB Atlas IP Whitelist

Add this IP to allow Render access:
```
0.0.0.0/0
```

## Test Login Credentials

```
Email: parnetstech13@gmail.com
Password: admin123
```

## Common Issues - Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| CORS Error | Check `FRONTEND_URL` in Render env vars |
| DB Connection Failed | Add `0.0.0.0/0` to MongoDB IP whitelist |
| Email Not Sending | Verify SMTP credentials, check Gmail App Password |
| Service Sleeping | Upgrade to Starter plan or accept cold start |
| Login Not Working | Check Render logs, verify all env vars set |

## Deployment Checklist

- [ ] Render account created
- [ ] Web service configured
- [ ] All environment variables added
- [ ] MongoDB IP whitelist updated
- [ ] Backend deployed successfully
- [ ] Health check returns OK
- [ ] Frontend .env updated
- [ ] Frontend redeployed
- [ ] Login tested and working
- [ ] OTP emails received

## Support Files

- `RENDER_SETUP_HINDI.md` - Complete Hindi guide
- `RENDER_DEPLOYMENT.md` - English deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Detailed checklist
- `render.yaml` - Auto-deployment config
- `.env.production` - Production env template

## Need Help?

1. Check Render logs first
2. Test health endpoint
3. Verify environment variables
4. Check MongoDB connection
5. Review CORS settings

**Render Logs:** Dashboard → Your Service → Logs
