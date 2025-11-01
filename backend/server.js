const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/parcels', require('./routes/parcels'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/carriers', require('./routes/carriers'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/provinces', require('./routes/provinces'));
app.use('/api/banks', require('./routes/banks'));
app.use('/api/balance', require('./routes/balance'));
app.use('/api/packages', require('./routes/packages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

