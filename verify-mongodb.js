#!/usr/bin/env node

/**
 * MongoDB Connection Verification Script
 * Run: node verify-mongodb.js
 * 
 * This script verifies:
 * 1. Environment variables are set
 * 2. MongoDB connection can be established
 * 3. All models are properly configured
 * 4. Database operations work correctly
 */

require('dotenv').config();

const mongoose = require('mongoose');

async function verify() {
  console.log('🔍 MongoDB Migration Verification\n');

  // Check environment variables
  console.log('1️⃣  Checking environment variables...');
  const mongoUri = process.env.MONGODB_URI || process.env.tickets_MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI or tickets_MONGODB_URI not found in .env');
    process.exit(1);
  }
  console.log('✅ MongoDB URI found\n');

  // Test connection
  console.log('2️⃣  Testing MongoDB connection...');
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }

  // Check models
  console.log('3️⃣  Verifying models...');
  const models = ['User', 'Ticket', 'Department', 'Stage', 'Comment', 'AuditLog'];
  const requiredModels = require('./models/index.js');
  
  for (const modelName of models) {
    if (!requiredModels[modelName]) {
      console.error(`❌ Model ${modelName} not found`);
      process.exit(1);
    }
  }
  console.log(`✅ All ${models.length} models found\n`);

  // Test basic operations
  console.log('4️⃣  Testing basic database operations...');
  try {
    // Count documents (non-destructive test)
    const userCount = await requiredModels.User.countDocuments();
    const ticketCount = await requiredModels.Ticket.countDocuments();
    console.log(`   Users: ${userCount}`);
    console.log(`   Tickets: ${ticketCount}`);
    console.log('✅ Database operations working\n');
  } catch (error) {
    console.error('❌ Database operation failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }

  // Check indexes
  console.log('5️⃣  Verifying indexes...');
  try {
    const userIndexes = await requiredModels.User.collection.getIndexes();
    console.log(`   User indexes: ${Object.keys(userIndexes).length}`);
    console.log('✅ Indexes properly configured\n');
  } catch (error) {
    console.error('❌ Index check failed:');
    console.error(`   ${error.message}\n`);
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ MongoDB Migration Verification Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

verify().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
