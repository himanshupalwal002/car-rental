import express from 'express';
import Car from '../models/Car.js';
import { protect, ownerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

const isMine = (car, user) =>
  user.role === 'admin' || (car.owner && car.owner.toString() === user._id.toString());

// Anyone can see the cars
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  res.json(await Car.find(filter));
});

// Owners and admins add cars
router.post('/', protect, ownerOrAdmin, async (req, res) => {
  try {
    const car = await Car.create({ ...req.body, owner: req.user._id });
    res.status(201).json(car);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Only the car's owner (or admin) can edit
router.put('/:id', protect, ownerOrAdmin, async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car || !isMine(car, req.user)) {
    return res.status(403).json({ message: 'Not your car' });
  }
  Object.assign(car, req.body, { owner: car.owner });
  res.json(await car.save());
});

// Only the car's owner (or admin) can delete
router.delete('/:id', protect, ownerOrAdmin, async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car || !isMine(car, req.user)) {
    return res.status(403).json({ message: 'Not your car' });
  }
  await car.deleteOne();
  res.json({ message: 'Car deleted' });
});

export default router;