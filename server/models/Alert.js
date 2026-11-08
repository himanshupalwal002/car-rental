import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['geofence', 'overspeeding'] },
    message: String,
  },
  { timestamps: true }
);

export default mongoose.model('Alert', alertSchema);