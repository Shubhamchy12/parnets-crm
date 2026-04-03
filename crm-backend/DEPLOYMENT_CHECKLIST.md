# 🚀 Deployment Checklist - Render Backend

## Pre-Deployment

- [ ] MongoDB Atlas setup complete
- [ ] MongoDB IP whitelist includes `0.0.0.0/0` (for Render)
- [ ] Gmail App Password generated for SMTP
- [ ] Strong JWT secrets generated
- [ ] Frontend deployed on Netlify (get URL)

## Render Setup

### Step 1: Create Web Service
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Select repository: `your-repo-name`

### Step 2: Configure Service
```
Name: parnets-crm-backend
Region: Singapore
Branch: main
Root Directory: crm-backend
Environment: Node
Build Command: npm install
Start Command: node server.js
Plan: Free (or Starter for production)
```

### Step 3: Add Environment Variables

Copy-paste these in Render Dashboard → Environment:

```bash
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

### Step 4: Deploy
- [ ] Click "Create Web Service"
- [ ] Wait 5-10 minutes for deployment
- [ ] Note your backend URL: `https://parnetscrm.onrender.com`

## Post-Deployment

### Step 5: Test Backend
```bash
# Health check
curl https://parnetscrm.onrender.com/api/health

# Expected response:
# {"status":"OK","message":"CRM Backend is running","db":"connected"}
```

### Step 6: Update Frontend
Update `crm-frontent/.env`:
```env
VITE_API_BASE_URL=https://parnetscrm.onrender.com/api
VITE_SOCKET_URL=https://parnetscrm.onrender.com
```

Redeploy frontend on Netlify.

### Step 7: Test Login Flow
1. Open frontend: `https://parnetscrm.netlify.app`
2. Login with: `parnetstech13@gmail.com` / `admin123`
3. Check email for OTP
4. Enter OTP and verify login works

### Step 8: Monitor Logs
- [ ] Check Render Dashboard → Logs
- [ ] Verify no errors
- [ ] Check MongoDB connection successful
- [ ] Verify OTP emails sending

## Common Issues & Fixes

### ❌ Login Not Working
**Check:**
1. Render logs for errors
2. MongoDB connection (check Atlas IP whitelist)
3. CORS settings (FRONTEND_URL correct?)
4. JWT secrets set properly

**Fix:**
```bash
# Test health endpoint
curl https://parnetscrm.onrender.com/api/health

# Check Render logs
# Dashboard → Your Service → Logs
```

### ❌ CORS Error
**Symptoms:** Browser console shows CORS error

**Fix:**
1. Verify `FRONTEND_URL` in Render env vars
2. Check `server.js` CORS configuration
3. Ensure frontend URL matches exactly (no trailing slash)

### ❌ Database Connection Failed
**Symptoms:** "MongoDB connection error" in logs

**Fix:**
1. Go to MongoDB Atlas
2. Network Access → Add IP: `0.0.0.0/0`
3. Database Access → Verify user credentials
4. Test connection string

### ❌ Email Not Sending
**Symptoms:** OTP not received

**Fix:**
1. Check SMTP credentials in Render env vars
2. Verify Gmail App Password (not regular password)
3. Check Render logs for email errors
4. Test: `curl https://parnetscrm.onrender.com/api/test-email`

### ❌ Service Sleeping (Free Tier)
**Symptoms:** First request takes 30-60 seconds

**Solution:**
- Upgrade to Starter plan ($7/month)
- Or use a ping service to keep it awake
- Or accept the cold start delay

## 🎯 Success Criteria

- [ ] Backend URL accessible
- [ ] Health check returns "OK"
- [ ] Login flow works end-to-end
- [ ] OTP emails received
- [ ] No errors in Render logs
- [ ] Frontend can communicate with backend
- [ ] All API endpoints working

## 📊 Monitoring

**Daily Checks:**
- Check Render logs for errors
- Monitor MongoDB Atlas metrics
- Test login flow
- Check email delivery

**Weekly Checks:**
- Review Render usage/costs
- Check MongoDB storage
- Update dependencies if needed
- Review security logs

## 🔐 Security Notes

1. **Never commit:**
   - `.env` files
   - Passwords or secrets
   - API keys

2. **Production secrets:**
   - Use strong, unique JWT secrets
   - Rotate secrets periodically
   - Use environment variables only

3. **MongoDB:**
   - Restrict IP access if possible
   - Use strong database password
   - Enable MongoDB Atlas monitoring

## 📞 Need Help?

1. Check Render logs first
2. Test each endpoint individually
3. Verify environment variables
4. Check MongoDB connection
5. Review CORS configuration

**Render Dashboard:** https://dashboard.render.com
**MongoDB Atlas:** https://cloud.mongodb.com
