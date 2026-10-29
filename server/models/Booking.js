import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalPrice: Number,
    depositAmount: { type: Number, default: 5000 },
    licenceNumber: String,
    agreementAcceptedAt: Date,
    status: {
      type: String,
      enum: ['confirmed', 'active', 'completed', 'cancelled'],
      default: 'confirmed',
    },
    pickupInspection: { notes: String, photos: [String] },
    returnInspection: { notes: String, photos: [String] },
    actualReturnDate: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);
