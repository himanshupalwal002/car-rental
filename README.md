# Self-Drive Car Rental Platform

A full stack web app for a self-drive car rental organisation. Customers book cars, owners track their cars live on a map, speeding and damage are charged automatically, and the admin settles bookings against a security deposit.

## Features
- Three roles: customer, owner, admin, with JWT login
- Car listing and date-based booking with no double booking
- Security deposit, damage and accident claims, disputes, and settlement
- GPS pings, speeding fines above 100 km/h, and area (geofence) alerts
- Owner dashboard with a live map, trail history and alerts

## Tech stack
MongoDB, Express, React (Vite), Node.js, JWT, bcrypt, Leaflet

## Run it locally

1. Install Node.js and MongoDB.
2. Backend:
   ```
   cd server
   npm install
   ```
   Copy `.env.example` to `.env` and fill in the values, then:
   ```
   npm run dev
   ```
3. Frontend (second terminal):
   ```
   cd client
   npm install
   npm run dev
   ```
4. Open http://localhost:5173

## Accounts
Register customers and owners on the Login page. The admin role cannot be chosen at registration: register a user, then change its `role` to `admin` in MongoDB Compass.

## Fake GPS device
With a booking marked picked up:
```
cd server
node simulate.js <carId> [speed]
```

## Project structure
- `server/` Express API (models, routes, middleware, utils)
- `client/` React website
