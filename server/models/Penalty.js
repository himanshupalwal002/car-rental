import mongoose from 'mongoose';

const penaltySchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    type: {
      type: String,
      enum: [
        'overspeeding',
        'late_return',
        'minor_damage',
        'major_damage',
        'accident',
        'traffic_challan',
        'illegal_use',
        'other',
      ],
      required: true,
    },
    description: String,
    amount: { type: Number, required: true, min: 0 },
    speed: Number,
    evidence: [String],
    status: {
      type: String,
      enum: ['pending', 'disputed', 'approved', 'waived', 'paid'],
      default: 'pending',
    },
    disputeReason: String,
  },
  { timestamps: true }
);

export default mongoose.model('Penalty', penaltySchema);