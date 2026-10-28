import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const makeToken =(id) => jwt.sign({ id}, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req,res) => {
    try{
        const { name, email, password } = req.body;
        if(!name || !email || !password) {
            return res.status(400).json({ message: 'All feilds required' });
        }
        if(await User.findOne({ email})) {
            return res.status(400).json({message: 'Emailalready registered' });

        }
        const role = req.body.role === 'owner' ? 'owner' : 'customer';
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({name, email, password: hashed, role });
        res.status(201).json({
            token: makeToken(user._id),
            user: { id: user._id, name: user.name, role: user.role },
        });
    } catch (err) {
        res.status(500).json({ message: 'Server err.message' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Wrong email or password' });
    }
    res.json({
      token: makeToken(user._id),
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
