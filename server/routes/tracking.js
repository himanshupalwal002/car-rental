import express from 'express';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import Location from '../models/Location.js';
import Alert from '../models/Alert.js';
import { protect, ownerOrAdmin } from '../middleware/auth.js';
import { checkSpeed } from '../utils/checkSpeed.js';
import { distanceKm } from '../utils/geo.js';

const router = express.Router();

const canView = (car, user) =>
  user.role === 'admin' || (car.owner && car.owner.toString() === user._id.toString());

// 1. The GPS device sends a ping (uses the device key, not a login token)
router.post('/ping', async (req, res) => {
  try {
    if (!process.env.DEVICE_KEY || req.headers['x-device-key'] !== process.env.DEVICE_KEY) {
      return res.status(401).json({ message: 'Bad device key' });
    }

    const { carId } = req.body;
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    const speed = Number(req.body.speed ?? 0);
    if (!carId || isNaN(lat) || isNaN(lng) || isNaN(speed)) {
      return res.status(400).json({ message: 'carId, lat, lng and speed are required numbers' });
    }

    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const booking = await Booking.findOne({ car: carId, status: 'active' });

    await Location.create({ car: carId, booking: booking?._id, lat, lng, speed });
    car.lastLocation = { lat, lng, speed, at: new Date() };
    await car.save();

    const fine = await checkSpeed(booking, speed);
    if (fine) {
      await Alert.create({
        car: carId,
        booking: booking._id,
        owner: car.owner,
        type: 'overspeeding',
        message: 'Over-speeding at ' + speed + ' km/h',
      });
    }

    const g = car.geofence;
    if (g && g.radiusKm && distanceKm(lat, lng, g.lat, g.lng) > g.radiusKm) {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recent = await Alert.findOne({
        car: carId,
        type: 'geofence',
        createdAt: { $gt: tenMinAgo },
      });
      if (!recent) {
        await Alert.create({
          car: carId,
          booking: booking?._id,
          owner: car.owner,
          type: 'geofence',
          message: 'Car is outside the allowed area',
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 2. Owner: my cars with the latest position and who is renting now
router.get('/my-cars', protect, ownerOrAdmin, async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };
  const cars = await Car.find(filter);
  const active = await Booking.find({
    status: 'active',
    car: { $in: cars.map((c) => c._id) },
  }).populate('user', 'name');

  res.json(
    cars.map((c) => {
      const b = active.find((x) => x.car.toString() === c._id.toString());
      return {
        ...c.toObject(),
        rentedBy: b && b.user ? b.user.name : null,
        bookingId: b ? b._id : null,
      };
    })
  );
});

// 3. Owner: the trail of one car (default: last 24 hours)
router.get('/car/:id/history', protect, ownerOrAdmin, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car || !canView(car, req.user)) {
      return res.status(403).json({ message: 'Not your car' });
    }
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    if (isNaN(from) || isNaN(to)) {
      return res.status(400).json({ message: 'Invalid from or to date' });
    }
    const points = await Location.find({ car: car._id, createdAt: { $gte: from, $lte: to } })
      .sort('createdAt')
      .limit(2000);
    res.json(points);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. Owner: set the allowed area for a car
router.put('/car/:id/geofence', protect, ownerOrAdmin, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car || !canView(car, req.user)) {
      return res.status(403).json({ message: 'Not your car' });
    }
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    const radiusKm = Number(req.body.radiusKm);
    if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm) || radiusKm <= 0) {
      return res.status(400).json({ message: 'lat, lng and a positive radiusKm are required' });
    }
    car.geofence = { lat, lng, radiusKm };
    await car.save();
    res.json(car.geofence);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. Owner: alerts for my cars
router.get('/alerts', protect, ownerOrAdmin, async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };
  const list = await Alert.find(filter).populate('car', 'name').sort('-createdAt').limit(50);
  res.json(list);
});

export default router;