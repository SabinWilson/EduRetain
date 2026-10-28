const net = require('net');
const { MongoMemoryServer } = require('mongodb-memory-server');

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  console.log('[Mongo Daemon] Checking MongoDB port 27017...');

  const isPortInUse = await checkPort(27017);
  if (isPortInUse) {
    console.log('[Mongo Daemon] MongoDB or another service is already listening on port 27017.');
    console.log('[Mongo Daemon] Using existing MongoDB service at mongodb://127.0.0.1:27017/eduretain');
    // Keep process alive to satisfy background service runner
    setInterval(() => {}, 60000);
    return;
  }

  console.log('[Mongo Daemon] Starting In-Memory MongoDB on port 27017...');
  try {
    const mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'eduretain',
      },
    });

    console.log('[Mongo Daemon] Ready and listening at:', mongod.getUri());

    const cleanup = async () => {
      console.log('\n[Mongo Daemon] Stopping...');
      try {
        await mongod.stop();
      } catch (e) {}
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep event loop alive
    setInterval(() => {}, 60000);
  } catch (err) {
    console.error('[Mongo Daemon Fatal Error]:', err.message || err);
    process.exit(1);
  }
}

main();
