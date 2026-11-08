import Penalty from '../models/Penalty.js';
import { SPEED_LIMIT, speedFine } from '../config/penalties.js';

export async function checkSpeed(booking, speed) {
  if (!booking || speed <= SPEED_LIMIT) return null;

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await Penalty.findOne({
    booking: booking._id,
    type: 'overspeeding',
    createdAt: { $gt: tenMinAgo },
  });
  if (recent) return null;

  return Penalty.create({
    booking: booking._id,
    user: booking.user,
    car: booking.car,
    type: 'overspeeding',
    speed,
    amount: speedFine(speed),
    description: 'Speed ' + speed + ' km/h, limit ' + SPEED_LIMIT,
    status: 'approved',
  });
}