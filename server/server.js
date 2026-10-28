import express from 'express';  
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true}));
app.use('/api/auth', authRoutes);

mongoose
.connect(process.env.MONGO_URI)
.then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT, () => console.log('Server on port' + process .env.PORT));
})
.catch((err) => console.error(err));