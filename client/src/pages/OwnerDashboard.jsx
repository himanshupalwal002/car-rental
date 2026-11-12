import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';

const INDIA = [20.59, 78.96];
const label = (t) => t.replace(/_/g, ' ');

function Recenter({ lat, lng, focus }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  return null;
}

function AddCarForm({ onDone }) {
  const empty = {
    name: '',
    brand: '',
    type: 'hatchback',
    seats: 5,
    fuel: 'petrol',
    transmission: 'manual',
    pricePerDay: '',
    image: '',
  };
  const [form, setForm] = useState(empty);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cars', {
        ...form,
        seats: Number(form.seats),
        pricePerDay: Number(form.pricePerDay),
      });
      setForm(empty);
      onDone('Car added', true);
    } catch (err) {
      onDone(err.response?.data?.message || 'Could not add the car', false);
    }
  };

  return (
    <form onSubmit={submit} className='card'>
      <h3>Add a car</h3>
      <div className='inline-form'>
        <input name='name' placeholder='Car name' value={form.name} onChange={change} required />
        <input name='brand' placeholder='Brand' value={form.brand} onChange={change} />
        <select name='type' value={form.type} onChange={change}>
          <option value='hatchback'>hatchback</option>
          <option value='sedan'>sedan</option>
          <option value='SUV'>SUV</option>
          <option value='MUV'>MUV</option>
        </select>
        <input
          name='seats'
          type='number'
          min='1'
          placeholder='Seats'
          value={form.seats}
          onChange={change}
        />
        <select name='fuel' value={form.fuel} onChange={change}>
          <option value='petrol'>petrol</option>
          <option value='diesel'>diesel</option>
          <option value='CNG'>CNG</option>
          <option value='electric'>electric</option>
        </select>
        <select name='transmission' value={form.transmission} onChange={change}>
          <option value='manual'>manual</option>
          <option value='automatic'>automatic</option>
        </select>
        <input
          name='pricePerDay'
          type='number'
          min='1'
          placeholder='Price per day (Rs)'
          value={form.pricePerDay}
          onChange={change}
          required
        />
        <input name='image' placeholder='Image link (optional)' value={form.image} onChange={change} />
        <button type='submit'>Add car</button>
      </div>
    </form>
  );
}

function ClaimForm({ car, onDone }) {
  const [type, setType] = useState('minor_damage');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const body = { bookingId: car.bookingId, type, description };
    if (amount !== '') body.amount = Number(amount);
    try {
      await api.post('/penalties', body);
      setDescription('');
      setAmount('');
      onDone('Claim sent to the admin for review', true);
    } catch (err) {
      onDone(err.response?.data?.message || 'Could not send the claim', false);
    }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 10 }}>
      <div className='inline-form'>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value='minor_damage'>minor damage</option>
          <option value='major_damage'>major damage</option>
          <option value='accident'>accident</option>
          <option value='traffic_challan'>traffic challan</option>
          <option value='illegal_use'>illegal use</option>
          <option value='other'>other</option>
        </select>
        <input
          placeholder='What happened?'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type='number'
          min='0'
          placeholder='Amount (blank = default)'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button type='submit'>Send claim</button>
      </div>
    </form>
  );
}

function GeofenceForm({ car, onDone }) {
  const g = car.geofence || {};
  const [lat, setLat] = useState(g.lat ?? '');
  const [lng, setLng] = useState(g.lng ?? '');
  const [radiusKm, setRadiusKm] = useState(g.radiusKm ?? '');

  const useCurrent = () => {
    if (car.lastLocation && car.lastLocation.lat != null) {
      setLat(car.lastLocation.lat);
      setLng(car.lastLocation.lng);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put('/tracking/car/' + car._id + '/geofence', {
        lat: Number(lat),
        lng: Number(lng),
        radiusKm: Number(radiusKm),
      });
      onDone('Allowed area saved', true);
    } catch (err) {
      onDone(err.response?.data?.message || 'Could not save the area', false);
    }
  };

  return (
    <form onSubmit={save} className='card'>
      <h3>Allowed area for {car.name}</h3>
      <p className='muted'>
        If the car leaves this circle, you get an alert. Use the current position as the centre, then
        choose a radius.
      </p>
      <div className='inline-form'>
        <input
          type='number'
          step='any'
          placeholder='Centre latitude'
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          required
        />
        <input
          type='number'
          step='any'
          placeholder='Centre longitude'
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          required
        />
        <input
          type='number'
          step='any'
          min='0'
          placeholder='Radius (km)'
          value={radiusKm}
          onChange={(e) => setRadiusKm(e.target.value)}
          required
        />
        <button type='button' className='secondary' onClick={useCurrent}>
          Use current position
        </button>
        <button type='submit'>Save area</button>
      </div>
    </form>
  );
}

export default function OwnerDashboard() {
  const [cars, setCars] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [focusTick, setFocusTick] = useState(0);
  const [trail, setTrail] = useState([]);
  const [claimFor, setClaimFor] = useState('');
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, a, cl] = await Promise.all([
          api.get('/tracking/my-cars'),
          api.get('/tracking/alerts'),
          api.get('/penalties/claims'),
        ]);
        setCars(c.data);
        setAlerts(a.data);
        setClaims(cl.data);
        setSelectedId((prev) => {
          if (prev) return prev;
          const first = c.data.find((x) => x.lastLocation && x.lastLocation.lat != null);
          return first ? first._id : '';
        });
        if (selectedId) {
          const h = await api.get('/tracking/car/' + selectedId + '/history');
          setTrail(h.data.map((p) => [p.lat, p.lng]));
        } else {
          setTrail([]);
        }
      } catch (err) {
        setMsg({ text: err.response?.data?.message || 'Could not load your vehicles', ok: false });
      }
    };
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [selectedId, version]);

  const reload = () => setVersion((v) => v + 1);
  const done = (text, ok) => {
    setMsg({ text, ok });
    if (ok) reload();
  };
  const show = (id) => {
    setSelectedId(id);
    setFocusTick((n) => n + 1);
  };

  const hasPosition = (c) => c.lastLocation && c.lastLocation.lat != null;
  const located = cars.filter(hasPosition);
  const selected = cars.find((c) => c._id === selectedId);
  const pos = selected && hasPosition(selected) ? [selected.lastLocation.lat, selected.lastLocation.lng] : null;

  return (
    <div>
      <h2>My vehicles</h2>
      {msg.text && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}

      <p className='muted'>
        Live map, refreshed every 10 seconds.
        <span className='dot green' /> available
        <span className='dot red' /> on rent
      </p>

      <div className='map-box'>
        <MapContainer
          center={pos || INDIA}
          zoom={pos ? 13 : 5}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <Recenter
            lat={pos ? pos[0] : null}
            lng={pos ? pos[1] : null}
            focus={selectedId + '-' + focusTick}
          />

          {selected && selected.geofence && selected.geofence.radiusKm > 0 && (
            <Circle
              center={[selected.geofence.lat, selected.geofence.lng]}
              radius={selected.geofence.radiusKm * 1000}
              pathOptions={{ color: '#7b2cbf', fillOpacity: 0.08, dashArray: '8 8' }}
            />
          )}

          {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#7b2cbf', weight: 4 }} />}

          {located.map((c) => (
            <CircleMarker
              key={c._id}
              center={[c.lastLocation.lat, c.lastLocation.lng]}
              radius={c._id === selectedId ? 14 : 10}
              pathOptions={{
                color: '#1a1033',
                weight: 3,
                fillColor: c.rentedBy ? '#e0143c' : '#0a8f5a',
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => setSelectedId(c._id) }}
            >
              <Popup>
                <strong>{c.name}</strong>
                <br />
                {c.rentedBy ? 'Rented by ' + c.rentedBy : 'Available'}
                <br />
                Speed: {c.lastLocation.speed} km/h
                <br />
                Updated: {new Date(c.lastLocation.at).toLocaleTimeString()}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <h2>Vehicles</h2>
      {cars.length === 0 && <p className='muted'>You have no cars yet. Add one below.</p>}
      {cars.map((c) => (
        <div key={c._id} className='card'>
          <h3>
            {c.brand} {c.name}{' '}
            <span className='badge'>{c.rentedBy ? 'on rent: ' + c.rentedBy : 'available'}</span>
          </h3>
          <p className='muted'>
            Rs {c.pricePerDay} / day ·{' '}
            {hasPosition(c)
              ? 'last seen ' + new Date(c.lastLocation.at).toLocaleString() + ' at ' + c.lastLocation.speed + ' km/h'
              : 'no GPS data yet'}
          </p>
          <div className='row'>
            {hasPosition(c) && (
              <button className='secondary small' onClick={() => show(c._id)}>
                Show on map and trail
              </button>
            )}
            {c.bookingId && (
              <button className='small' onClick={() => setClaimFor(claimFor === c._id ? '' : c._id)}>
                {claimFor === c._id ? 'Close claim form' : 'Raise a claim'}
              </button>
            )}
          </div>
          {claimFor === c._id && c.bookingId && <ClaimForm car={c} onDone={done} />}
        </div>
      ))}

      {selected && <GeofenceForm key={selected._id} car={selected} onDone={done} />}

      <h2>Alerts</h2>
      {alerts.length === 0 && <p className='muted'>No alerts.</p>}
      {alerts.map((a) => (
        <div key={a._id} className='card'>
          <p>
            <span className='badge'>{a.type}</span> <strong>{a.car ? a.car.name : 'Car'}</strong>:{' '}
            {a.message}
          </p>
          <p className='muted'>{new Date(a.createdAt).toLocaleString()}</p>
        </div>
      ))}

      <h2>Claims on my cars</h2>
      {claims.length === 0 && <p className='muted'>No claims or charges yet.</p>}
      {claims.map((p) => (
        <div key={p._id} className='card'>
          <h3>
            {label(p.type)} · Rs {p.amount} <span className='badge'>{p.status}</span>
          </h3>
          <p className='muted'>
            {p.car ? p.car.name : 'Car'} · {p.user ? p.user.name : 'Customer'} ·{' '}
            {p.description || 'No description'}
          </p>
          {p.status === 'disputed' && <p className='muted'>Customer says: {p.disputeReason}</p>}
        </div>
      ))}

      <AddCarForm onDone={done} />
    </div>
  );
}