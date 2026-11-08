import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: '90d' },
});

export default mongoose.model('Location', locationSchema);