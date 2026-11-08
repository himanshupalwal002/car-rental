import dotenv from 'dotenv';

dotenv.config();

const carId = process.argv[2];
const fixedSpeed = process.argv[3];

if (!carId) {
  console.log('Usage: node simulate.js <carId> [speed]');
  process.exit(1);
}

let lat = 28.61;
let lng = 77.2;

setInterval(async () => {
  lat += 0.0005;
  lng += 0.0005;
  const speed = fixedSpeed ? Number(fixedSpeed) : Math.round(60 + Math.random() * 70);
  try {
    const res = await fetch('http://localhost:5000/api/tracking/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-key': process.env.DEVICE_KEY },
      body: JSON.stringify({ carId, lat, lng, speed }),
    });
    console.log(lat.toFixed(4), lng.toFixed(4), speed + ' km/h', 'status', res.status);
  } catch (err) {
    console.log('Ping failed:', err.message);
  }
}, 3000);