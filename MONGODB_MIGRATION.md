# MongoDB Migration Guide

This document outlines the MongoDB migration that has been completed for this project.

## What Changed

### 1. **Database Connection**
- Migrated to use MongoDB with Mongoose ORM
- Created serverless-compatible connection helper in `/lib/mongodb.js`
- Connection caching for Vercel/serverless functions
- Automatic fallback to in-memory MongoDB for testing

### 2. **Environment Variables**
Changed from `tickets_MONGODB_URI` to standard `MONGODB_URI`:

**Local Development** (`.env.local` or `.env`):
```
MONGODB_URI=mongodb://localhost:27017/tickets
TOKEN_SECRET_KEY=your-secret-key
NODE_ENV=development
```

**Vercel Production**:
Set `MONGODB_URI` in Vercel Environment Variables with your MongoDB Atlas connection string:
```
mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

### 3. **New Files Created**
- `/lib/mongodb.js` - Serverless-compatible MongoDB connection helper
- `/middlewares/db.middleware.js` - Middleware to ensure DB connection for each request
- `/controllers/health.controller.js` - Health check endpoints
- `/routes/health.route.js` - Health check routes
- `.env.example` - Environment variable template

### 4. **Modified Files**
- `/config/database.js` - Updated to use new connection helper
- `/app.js` - Added DB connection middleware
- `/middlewares/error.middleware.js` - Enhanced error handling for MongoDB
- `/.env` - Updated to use `MONGODB_URI`

### 5. **Existing Mongoose Models**
The following models are already defined and ready to use:
- `User` - User accounts with roles (employee, supervisor, manager, controller, owner)
- `Ticket` - Support tickets with status tracking
- `Department` - Organization departments
- `Stage` - Ticket status stages/workflows
- `Comment` - Ticket comments
- `AuditLog` - Action audit trail

## Setup Instructions

### Local Development

1. **Install MongoDB**
   ```bash
   # macOS with Homebrew
   brew tap mongodb/brew
   brew install mongodb-community

   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   ```

2. **Configure Environment**
   ```bash
   # Copy example to .env.local
   cp .env.example .env.local

   # Edit .env.local and set:
   MONGODB_URI=mongodb://localhost:27017/tickets
   TOKEN_SECRET_KEY=your-secret-dev-key
   NODE_ENV=development
   ```

3. **Start the API**
   ```bash
   npm install
   npm run dev
   ```

4. **Verify Connection**
   ```bash
   curl http://localhost:5000/health/db
   ```

### Production (Vercel)

1. **Create MongoDB Atlas Cluster**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create a free cluster
   - Create a database user
   - Get your connection string

2. **Set Environment Variable**
   - Go to Vercel Project Settings → Environment Variables
   - Add `MONGODB_URI` with your MongoDB Atlas connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`

3. **Deploy**
   ```bash
   git push  # Vercel auto-deploys
   ```

## API Endpoints

### Health Check
- `GET /health` - API health status
- `GET /health/db` - Database connection status

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/sync` - Sync user profile
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Tickets
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id` - Update ticket

### Other Resources
- `/api/users` - User management
- `/api/departments` - Department management
- `/api/stages` - Workflow stages
- `/api/dashboard` - Dashboard data
- `/api/reports` - Report generation
- `/api/audit-logs` - Audit trail

## Troubleshooting

### "Cannot connect to database"
1. Check `MONGODB_URI` environment variable is set
2. Verify connection string format
3. Ensure IP whitelist on MongoDB Atlas (for cloud databases)
4. For local: Ensure MongoDB service is running

### "MongoDB connection timeout"
1. Increase timeout in `/lib/mongodb.js` if needed
2. Check network connectivity
3. Verify database credentials

### "Duplicate key error (11000)"
1. Check for unique indexes on fields like `email`
2. Data might already exist - verify or drop and recreate collection

## Migration Checklist

- [x] Install Mongoose
- [x] Create serverless-compatible connection helper
- [x] Update environment variables
- [x] Create database middleware
- [x] Update error handling
- [x] Document setup process
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] Deploy to production

## Notes

- Connection pooling is configured for optimal performance in serverless environments
- MongoDB documents are automatically cached and reused across invocations
- In-memory MongoDB (`mongodb-memory-server`) is used for testing when no URI is provided
- All existing API responses remain unchanged for backwards compatibility

## Additional Resources

- [Mongoose Documentation](https://mongoosejs.com)
- [MongoDB Atlas Connection](https://docs.atlas.mongodb.com/driver-connection)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
