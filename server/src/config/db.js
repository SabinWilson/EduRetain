const mongoose = require('mongoose');

let isInMemory = false;
let mongodInstance = null;

function isInMemoryActive() {
  return isInMemory;
}

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduretain';

  try {
    console.log(`[DB] Attempting connection to MongoDB at: ${uri}`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    isInMemory = false;
    console.log('[DB] MongoDB connected successfully via URI.');
  } catch (err) {
    console.warn(`[DB] Could not connect to primary MongoDB at ${uri} (${err.message}).`);
    try {
      console.log('[DB] Initializing In-Memory MongoDB Server on port 27017...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbName: 'eduretain',
        },
      });
      const memoryUri = mongodInstance.getUri();
      await mongoose.connect(memoryUri);
      isInMemory = true;
      console.log(`[DB] MongoDB In-Memory Server connected successfully at: ${memoryUri}`);
    } catch (memErr) {
      console.warn(`[DB] Port 27017 in-memory failed (${memErr.message}), falling back to dynamic port...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const memUri = mongodInstance.getUri();
        await mongoose.connect(memUri);
        isInMemory = true;
        console.log(`[DB] MongoDB In-Memory Server connected at dynamic URI: ${memUri}`);
      } catch (finalErr) {
        console.error('[DB] Failed to initialize In-Memory MongoDB:', finalErr);
        throw finalErr;
      }
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error('[DB] Mongoose connection error:', err);
  });
}

async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}

module.exports = { connectDB, closeDB, isInMemoryActive };
