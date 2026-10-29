import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: String,
  type: String,
  seats: { type: Number, default: 5 },
  fuel: String,
  transmission: String,
  pricePerDay: { type: Number, required: true },
  image: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastLocation: { lat: Number, lng: Number, speed: Number, at: Date },
  geofence: { lat: Number, lng: Number, radiusKm: Number },
});

export default mongoose.model('Car', carSchema);
