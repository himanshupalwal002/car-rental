import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Car from './models/Car.js';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

await User.deleteMany({});
await Car.deleteMany({});

const hash = await bcrypt.hash('Password@123', 10);
await User.create({ name: 'Admin', email: 'admin@test.com', password: hash, role: 'admin' });
const owner = await User.create({ name: 'Owner One', email: 'owner@test.com', password: hash, role: 'owner' });
await User.create({ name: 'Customer One', email: 'customer@test.com', password: hash, role: 'customer' });

await Car.insertMany([
  { name: 'Swift', brand: 'Maruti', type: 'hatchback', seats: 5, fuel: 'petrol', transmission: 'manual', pricePerDay: 1500, owner: owner._id },
  { name: 'Creta', brand: 'Hyundai', type: 'SUV', seats: 5, fuel: 'diesel', transmission: 'automatic', pricePerDay: 2800, owner: owner._id },
  { name: 'City', brand: 'Honda', type: 'sedan', seats: 5, fuel: 'petrol', transmission: 'automatic', pricePerDay: 2200, owner: owner._id },
]);

console.log('Seeded. Logins: admin@test.com, owner@test.com, customer@test.com. Password: Password@123');
process.exit(0);