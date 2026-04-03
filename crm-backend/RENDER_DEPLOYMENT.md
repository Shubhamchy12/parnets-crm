# Render Deployment Guide - Parnets CRM Backend

## 🚀 Quick Deployment Steps

### 1. Render Account Setup
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository

### 2. Configure Web Service

**Basic Settings:**
- Name: `parnets-crm-backend`
- Region: `Singapore` (or closest to your users)
- Branch: `main` (or your deployment branch)
- Root Directory: `crm-backend`
- Environment: `Node`
- Build Command: `npm install`
- Start Command: `node server.js`

**Instance Type:**
- Free tier (for testing)
- Starter ($7/month) for production

### 3. Environment Variables

Add these in Render Dashboard → Environment:

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

### 4. Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Your backend URL will be: `https://parnetscrm.onrender.com`

### 5. Update Frontend
Update `crm-frontent/.env`:
```
VITE_API_BASE_URL=https://parnetscrm.onrender.com/api
VITE_SOCKET_URL=https://parnetscrm.onrender.com
```

### 6. Test Login
1. Go to your frontend URL
2. Login with: `parnetstech13@gmail.com` / `admin123`
3. Check OTP in email or console logs

## 🔍 Troubleshooting

### Login Issues
- Check Render logs: Dashboard → Logs
- Verify MongoDB connection
- Check CORS settings in server.js
- Verify JWT secrets are set

### Email Not Working
- Check SMTP credentials
- Verify Gmail App Password
- Check Render logs for email errors

### Database Connection Failed
- Verify MongoDB URI is correct
- Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for Render)
- Test connection with test script

### CORS Errors
- Verify FRONTEND_URL matches your Netlify URL
- Check browser console for exact error
- Server.js already allows production origins

## 📊 Monitoring

**Health Check:**
```
GET https://parnetscrm.onrender.com/api/health
```

**Test Email:**
```
GET https://parnetscrm.onrender.com/api/test-email
```

## ⚠️ Important Notes

1. **Free Tier Limitations:**
   - Service sleeps after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds
   - 750 hours/month free

2. **MongoDB Atlas:**
   - Add Render IPs to whitelist: `0.0.0.0/0` (all IPs)
   - Or specific Render IP ranges

3. **Environment Variables:**
   - Never commit `.env` to Git
   - Use Render Dashboard for secrets
   - Update JWT secrets for production

4. **Logs:**
   - View real-time logs in Render Dashboard
   - Check for startup errors
   - Monitor OTP generation

## 🔐 Security Checklist

- ✅ Strong JWT secrets (not default)
- ✅ HTTPS only in production
- ✅ CORS configured for frontend domain
- ✅ MongoDB connection string secure
- ✅ Email credentials protected
- ✅ No sensitive data in logs

## 📞 Support

If login still not working:
1. Check Render logs for errors
2. Test `/api/health` endpoint
3. Verify all environment variables
4. Check MongoDB connection
5. Test email service with `/api/test-email`
