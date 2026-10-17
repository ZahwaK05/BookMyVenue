const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from .env, refusing to start');
  process.exit(1);
}

const authRouter = require('./routes/auth');
const signupOtpRouter = require('./routes/signupOtp');
const amenitiesRouter = require('./routes/amenities');
const venuesRouter = require('./routes/venues');
const usersRouter = require('./routes/users');
const bookingsRouter = require('./routes/bookings');
const venueAmenitiesRouter = require('./routes/venueAmenities');
const blocksRouter = require('./routes/blocks');
const issuesRouter = require('./routes/issues');
const timetableRouter = require('./routes/timetable');
const recommendRouter = require('./routes/recommend');
const adminRouter = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// OTP signup routes must be mounted before the main auth router
app.use('/auth', signupOtpRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/bookings', bookingsRouter);
app.use('/venues', venuesRouter);
app.use('/blocks', blocksRouter);
app.use('/issues', issuesRouter);
app.use('/timetable', timetableRouter);
app.use('/recommend', recommendRouter);
app.use('/admin', adminRouter);
app.use('/amenities', amenitiesRouter);
app.use('/', venueAmenitiesRouter);

// Central error handler - routes throw errors with a .status for expected
// failures (400/403/404/409); anything else is logged and returned as a 500
// so raw Postgres errors never leak to the client.
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server };