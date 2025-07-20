const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { globalErrorHandler } = require('./utils/errorHandler');
const runStressTest = require('./stress');


dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Live request tracking (for concurrency monitoring)
let liveRequests = 0;
app.use((req, res, next) => {
  liveRequests++;
  console.log('Concurrent Requests:', liveRequests);
  res.on('finish', () => {
    liveRequests--;
  });
  next();
});

// Socket.IO setup
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_shop_queue', (shopId) => {
    if (shopId) {
      socket.join(shopId.toString());
      console.log(`Socket ${socket.id} joined room: ${shopId}`);
    }
  });

  socket.on('leave_shop_queue', (shopId) => {
    if (shopId) {
      socket.leave(shopId.toString());
      console.log(`Socket ${socket.id} left room: ${shopId}`);
    }
  });

  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`Socket ${socket.id} joined user room: ${userId}`);
    }
  });

  socket.on('leave_user_room', (userId) => {
    if (userId) {
      socket.leave(userId.toString());
      console.log(`Socket ${socket.id} left user room: ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Models
require('./models/Admin');
require('./models/Barber');
require('./models/History');
require('./models/Owner');
require('./models/Queue');
require('./models/Service');
require('./models/Shop');
require('./models/Subscription');
require('./models/User');

// Routes
const userRoutes = require('./routes/userRoutes');
const otpRoutes = require('./routes/otpRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const shopRoutes = require('./routes/shopRoutes');
const barberRoutes = require('./routes/barberRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const queueRoutes = require('./routes/queueRoutes')(io);
const historyRoutes = require('./routes/historyRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/users', userRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// Root Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Ping Route
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Test Route for stress testing
app.get('/test', async (req, res) => {
  try {
    const stats = await runStressTest();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Stress test failed', details: err.message });
  }
});


// Error Handler
app.use(globalErrorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'local'} mode on port ${PORT}`);
  
  // // Self-ping to keep server alive (useful in free hosting)
  // setInterval(() => {
  //   fetch('http://localhost:' + PORT + '/ping')
  //     .then(() => console.log('Pinged self!'))
  //     .catch(() => console.log('Self ping failed.'));
  // }, 1000 * 60 * 10);
});
