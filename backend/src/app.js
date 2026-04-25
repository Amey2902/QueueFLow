require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;

const app = express();

// CORS — allow frontend origin with credentials for session cookies
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));

app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, ttl: 60 * 60 * 24 }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
}));

app.use('/api/auth', require('./routes/auth'));

app.use('/api/services', require('./routes/services'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/slots', require('./routes/slots'));
app.use('/api/organizer', require('./routes/organizer'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
