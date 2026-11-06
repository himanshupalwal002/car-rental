import express from 'express';
import Penalty from '../models/Penalty.js';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import User from '../models/User.js';
import { protect, adminOnly, ownerOrAdmin } from '../middleware/auth.js';
import { LATE_FEE_PER_HOUR, DEFAULT_DAMAGE } from '../config/penalties.js';

const router = express.Router();

// 1. Owner or admin raises a charge or claim
router.post('/', protect, ownerOrAdmin, async (req, res) => {
  try {
    const { bookingId, type, description, amount, evidence } = req.body;
    if (!bookingId || !type) {
      return res.status(400).json({ message: 'bookingId and type are required' });
    }

    const booking = await Booking.findById(bookingId).populate('car');
    if (!booking || !booking.car) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (req.user.role === 'owner' && booking.car.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your car' });
    }

    const finalAmount = amount !== undefined ? Number(amount) : DEFAULT_DAMAGE[type];
    if (finalAmount === undefined || isNaN(finalAmount)) {
      return res.status(400).json({ message: 'Amount is required for this type' });
    }

    const penalty = await Penalty.create({
      booking: bookingId,
      user: booking.user,
      car: booking.car._id,
      type,
      description,
      evidence: evidence || [],
      amount: finalAmount,
      status: 'pending',
    });
    res.status(201).json(penalty);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 2. Customer: see my own charges
router.get('/my', protect, async (req, res) => {
  const list = await Penalty.find({ user: req.user._id }).populate('car', 'name').sort('-createdAt');
  res.json(list);
});

// 3. Customer: dispute a charge
router.put('/:id/dispute', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'A reason is required' });

    const p = await Penalty.findById(req.params.id);
    if (!p || p.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Not found' });
    }
    if (!['pending', 'approved'].includes(p.status)) {
      return res.status(400).json({ message: 'This charge is already ' + p.status });
    }
    p.status = 'disputed';
    p.disputeReason = reason;
    await p.save();
    res.json(p);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. Owner: charges on my cars (admin sees everything)
router.get('/claims', protect, ownerOrAdmin, async (req, res) => {
  const filter = {};
  if (req.user.role === 'owner') {
    const cars = await Car.find({ owner: req.user._id }).select('_id');
    filter.car = { $in: cars.map((c) => c._id) };
  }
  const list = await Penalty.find(filter)
    .populate('user', 'name email')
    .populate('car', 'name')
    .sort('-createdAt');
  res.json(list);
});

// 5. Admin: list everything
router.get('/', protect, adminOnly, async (req, res) => {
  const list = await Penalty.find()
    .populate('user', 'name email')
    .populate('car', 'name')
    .sort('-createdAt');
  res.json(list);
});

// 6. Admin: approve or waive a charge
router.put('/:id/resolve', protect, adminOnly, async (req, res) => {
  try {
    const { status, amount } = req.body;
    if (!['approved', 'waived'].includes(status)) {
      return res.status(400).json({ message: 'status must be approved or waived' });
    }
    const p = await Penalty.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    if (p.status === 'paid') {
      return res.status(400).json({ message: 'This charge is already paid' });
    }
    p.status = status;
    if (amount !== undefined) p.amount = Number(amount);
    await p.save();
    res.json(p);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 7. Admin: block a user
router.put('/blacklist/:userId', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { blacklisted: true, blacklistReason: req.body.reason },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User blocked', user: user.email });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 8. Admin: settle a booking when the car is returned
router.post('/settle/:bookingId', protect, adminOnly, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Already settled' });
    }
    if (booking.status !== 'active') {
      return res.status(400).json({ message: 'Only active bookings can be settled. Mark pickup first.' });
    }

    const open = await Penalty.countDocuments({
      booking: booking._id,
      status: { $in: ['pending', 'disputed'] },
    });
    if (open > 0) {
      return res.status(400).json({ message: open + ' penalty item(s) still need a decision' });
    }

    const now = new Date();
    if (now > booking.endDate) {
      const hours = Math.ceil((now - booking.endDate) / (1000 * 60 * 60));
      await Penalty.create({
        booking: booking._id,
        user: booking.user,
        car: booking.car,
        type: 'late_return',
        amount: hours * LATE_FEE_PER_HOUR,
        description: hours + ' hour(s) late',
        status: 'approved',
      });
    }

    const items = await Penalty.find({ booking: booking._id, status: 'approved' });
    const total = items.reduce((sum, p) => sum + p.amount, 0);
    const fromDeposit = Math.min(total, booking.depositAmount);
    const extraDue = total - fromDeposit;
    const refund = booking.depositAmount - fromDeposit;

    await Penalty.updateMany({ booking: booking._id, status: 'approved' }, { status: 'paid' });
    booking.status = 'completed';
    booking.actualReturnDate = now;
    await booking.save();

    res.json({
      totalPenalties: total,
      deductedFromDeposit: fromDeposit,
      extraAmountDue: extraDue,
      depositRefund: refund,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;