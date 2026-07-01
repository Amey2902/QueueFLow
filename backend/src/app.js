require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;

const app = express();

// CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://queue-f-low.vercel.app'
  ],
  credentials: true,
}));

// Middleware
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,

  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 60 * 60 * 24,
  }),

  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/slots', require('./routes/slots'));
app.use('/api/organizer', require('./routes/organizer'));

// Health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;