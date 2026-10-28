require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/db');
const { setSocketIO } = require('./services/alertService');
const { initCronJobs } = require('./jobs/cronScheduler');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

setSocketIO(io);

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Mentors join room to receive alerts for their assigned students
  socket.on('join-mentor', (mentorId) => {
    if (mentorId) {
      const room = `mentor-${mentorId}`;
      socket.join(room);
      console.log(`[Socket.io] Mentor ${mentorId} joined room: ${room}`);
    }
  });

  // Admins join admin room to receive all system alerts
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log(`[Socket.io] Admin joined room: admin-room`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

async function startServer() {
  try {
    await connectDB();

    // Auto-seed on first run if database has no users
    const { User } = require('./models');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Database is empty. Running initial seeder automatically...');
      const { seedDatabase } = require('./seeders/seed');
      await seedDatabase({ force: false, closeOnFinish: false });
    }

    initCronJobs();

    // Explicitly bind server to 0.0.0.0 to answer on all interfaces (IPv4 127.0.0.1 and localhost)
    app.listen = function (port = PORT, host = '0.0.0.0', callback) {
      return server.listen(port, host, callback);
    };

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`EduRetain Backend Server running on port ${PORT}`);
      console.log(`API URL: http://127.0.0.1:${PORT}/api (and http://localhost:${PORT}/api)`);
      console.log(`ML URL:  ${process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000'}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, server };
