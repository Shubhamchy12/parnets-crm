# Server Restart Instructions

## The email service needs the server to be restarted to work properly.

### Option 1: Stop and Start (Recommended)

1. **Stop the current server:**
   - Press `Ctrl + C` in the terminal where the server is running

2. **Start the server again:**
   ```bash
   cd crm-backend
   npm start
   ```

### Option 2: Using nodemon (Development)

If you're using nodemon, it should auto-restart. If not:

```bash
cd crm-backend
npm run dev
```

### Option 3: Kill Process and Restart

If the server is stuck:

**Windows:**
```bash
# Find the process
netstat -ano | findstr :5002

# Kill it (replace PID with actual process ID)
taskkill /PID <PID> /F

# Start server
cd crm-backend
npm start
```

**Linux/Mac:**
```bash
# Find and kill
lsof -ti:5002 | xargs kill -9

# Start server
cd crm-backend
npm start
```

## What to Look For

When the server starts correctly, you should see:

```
📧 Initializing email service...
✅ Email service initialized successfully
📧 Sending emails from: Parnets CRM <parnetstech13@gmail.com>
✅ SMTP connection verified successfully
✅ MongoDB connected
🚀 Server running on http://localhost:5002
```

## If Email Service Still Not Working

Run the test script:
```bash
cd crm-backend
node scripts/test-email-service.mjs
```

This will show you exactly what's wrong with the configuration.
