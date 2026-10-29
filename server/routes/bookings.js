import express from 'express';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Create a booking
router.post('/', protect, async (req, res) => {
  try {
    const { carId, startDate, endDate, licenceNumber, agreementAccepted } = req.body;

    if (req.user.blacklisted) {
      return res.status(403).json({ message: 'Your account is blocked. Contact the company.' });
    }
    if (!licenceNumber || !agreementAccepted) {
      return res.status(400).json({ message: 'Licence number and agreement acceptance are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start) || isNaN(end) || end <= start || start < today) {
      return res.status(400).json({ message: 'Invalid dates' });
    }

    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const clash = await Booking.findOne({
      car: carId,
      status: { $in: ['confirmed', 'active'] },
      startDate: { $lt: end },
      endDate: { $gt: start },
    });
    if (clash) {
      return res.status(400).json({ message: 'Car is already booked for these dates' });
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const booking = await Booking.create({
      user: req.user._id,
      car: carId,
      startDate: start,
      endDate: end,
      totalPrice: days * car.pricePerDay,
      licenceNumber,
      agreementAcceptedAt: new Date(),
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// My bookings
router.get('/my', protect, async (req, res) => {
  const list = await Booking.find({ user: req.user._id }).populate('car').sort('-createdAt');
  res.json(list);
});

// Cancel a booking (the customer who made it, or admin)
router.put('/:id/cancel', protect, async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Not found' });

  const owner = booking.user.toString() === req.user._id.toString();
  if (!owner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not allowed' });
  }
  if (['completed', 'cancelled'].includes(booking.status)) {
    return res.status(400).json({ message: 'This booking is already ' + booking.status });
  }
  booking.status = 'cancelled';
  await booking.save();
  res.json(booking);
});

// Admin: all bookings
router.get('/', protect, adminOnly, async (req, res) => {
  const list = await Booking.find()
    .populate('car')
    .populate('user', 'name email')
    .sort('-createdAt');
  res.json(list);
});

// Admin: car picked up, booking becomes active
router.put('/:id/pickup', protect, adminOnly, async (req, res) => {
  const { notes, photos } = req.body;
  const b = await Booking.findByIdAndUpdate(
    req.params.id,
    { status: 'active', pickupInspection: { notes, photos: photos || [] } },
    { new: true }
  );
  res.json(b);
});

// Admin: record the return inspection
router.put('/:id/return-inspection', protect, adminOnly, async (req, res) => {
  const { notes, photos } = req.body;
  const b = await Booking.findByIdAndUpdate(
    req.params.id,
    { returnInspection: { notes, photos: photos || [] } },
    { new: true }
  );
  res.json(b);
});

export default router;
