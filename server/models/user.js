import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'owner', 'admin'], default: 'customer' },
    licenceNumber:  String,
    blacklisted: {type: Boolean, default: false},
    blacklistedReason: String,
});

export default mongoose.model('User', userSchema);