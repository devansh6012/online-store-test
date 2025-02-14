const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const orderRouter = require('./routes/orders');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/orders', orderRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
