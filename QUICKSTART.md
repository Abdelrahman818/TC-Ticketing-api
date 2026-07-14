# MongoDB Migration - Quick Start Guide

## For Local Development

### 1. Start MongoDB
```bash
# Option A: Using Docker (recommended)
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Option B: Using Homebrew (macOS)
brew services start mongodb-community

# Option C: Manual install
# Download from https://www.mongodb.com/try/download/community
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local - Set:
MONGODB_URI=mongodb://localhost:27017/tickets
TOKEN_SECRET_KEY=your-dev-key
NODE_ENV=development
```

### 3. Verify Setup
```bash
# Run verification script
node verify-mongodb.js

# Expected output: ✅ MongoDB Migration Verification Complete!
```

### 4. Start Development Server
```bash
# Install dependencies
npm install

# Start with auto-reload
npm run dev

# Or start normally
npm start
```

### 5. Test the Connection
```bash
# In another terminal:
curl http://localhost:5000/health/db

# Expected response:
# {"success":true,"message":"Database connection is healthy","data":{"status":"connected",...}}
```

## For Vercel Deployment

### 1. Set Environment Variable
```bash
# In Vercel dashboard:
# Project Settings → Environment Variables
# 
# Add:
# Name: MONGODB_URI
# Value: mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
# Environments: Production, Preview, Development
```

### 2. Update MongoDB Atlas
```bash
# In MongoDB Atlas:
# 1. Go to Security → Network Access
# 2. Add Vercel IPs to whitelist
#    Or add 0.0.0.0/0 for testing (NOT for production)
```

### 3. Deploy
```bash
git push  # Vercel auto-deploys
```

## Available Endpoints

### Health
- `GET /health` - API status
- `GET /health/db` - Database status

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/sync` - Sync profile
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Other Resources
- `GET/POST /api/tickets` - Manage tickets
- `GET/POST /api/users` - Manage users
- `GET/POST /api/departments` - Manage departments
- `GET/POST /api/stages` - Manage stages
- `GET /api/dashboard/*` - Dashboard data
- `GET /api/reports/*` - Reports

## Common Issues

### "Cannot connect to MongoDB"
```bash
# Check MongoDB is running:
docker ps  # Should show mongodb container

# Or check service:
brew services list | grep mongodb
```

### "MONGODB_URI not set"
```bash
# Make sure .env.local exists and has:
echo $MONGODB_URI  # Should print connection string
```

### "Connection timeout"
```bash
# Increase timeout in lib/mongodb.js
# serverSelectionTimeoutMS: 10000  (from 5000)
```

## Scripts

```bash
npm run dev      # Development with auto-reload
npm start        # Production start
npm test         # Run tests
npm run build    # Build (if applicable)
```

## Tips

- ✅ Always use `.env.local` for local development
- ✅ Never commit `.env` files
- ✅ Use `verify-mongodb.js` to test setup
- ✅ Check `/health/db` endpoint first for issues
- ✅ Monitor server logs for detailed errors

## Next Steps

1. ✅ Start MongoDB locally
2. ✅ Copy `.env.example` to `.env.local`
3. ✅ Run `node verify-mongodb.js`
4. ✅ Run `npm run dev`
5. ✅ Test with `curl http://localhost:5000/health/db`

For detailed guides, see:
- [MONGODB_MIGRATION.md](./MONGODB_MIGRATION.md) - Complete migration guide
- [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - Summary of all changes
