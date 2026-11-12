# Self-Drive Car Rental Platform

A full stack web app for self drive car rental organisation. Customers book cars, owner track their cars on live map, speeding and damage are changed automatically , and the admin settles the bookings against a security deposit.

## Features
- three roles: customer, owner, admin, with JWT login
- Car listing and date-based booking with no double booking
- Security deposit, damage and accif=dent claims, disputes, and settlement
- GPS pings, speeding fines above 100 km.h, and area(geofence) alerts
- Owner dashboard with a live map, trail history and alerts

## Tech Stack
MongoDB, Express, React (Vite), Node.js, JWT, bcrypt, Leaflet

## Run it Locally

1. Install Node.js and MongoDB
2. Beckend: 
   ```
   cd server
   npm install
   ```
   copy `.env.example` to `.env` and fill in the values, then:
   ```
   npm run dev
   ```
3. Frontend  (second terminal):
   ```
   cd client
   npm install
   npm run dev
   ```
4. Open http://localhost:5173

## Accounts
Register customers and owners on the login page. The admin role cannot be chosen at registration: register a user, then change its `role` to `admin` in MongoDB Compass.

## Fake GPS device
with a booking marked picked up:
```
cd server
node simulate.js <cardId> [speed]
```
## Project structure
- `server/` Express API (models, routes, middleware, utils)
- `client/` React website