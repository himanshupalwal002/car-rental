import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

const today = new Date().toISOString().split('T')[0];

function CarCard({ car }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dates, setDates] = useState({ startDate: '', endDate: '' });
  const [licenceNumber, setLicenceNumber] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [busy, setBusy] = useState(false);

  const days =
    dates.startDate && dates.endDate
      ? Math.ceil((new Date(dates.endDate) - new Date(dates.startDate)) / (1000 * 60 * 60 * 24))
      : 0;

  const ready = dates.startDate && dates.endDate && days > 0 && licenceNumber && agreed;

  const book = async () => {
    setMsg({ text: '', ok: false });
    setBusy(true);
    try {
      const { data } = await api.post('/bookings', {
        carId: car._id,
        startDate: dates.startDate,
        endDate: dates.endDate,
        licenceNumber,
        agreementAccepted: agreed,
      });
      setMsg({ text: 'Booked. Total Rs ' + data.totalPrice, ok: true });
      setDates({ startDate: '', endDate: '' });
      setLicenceNumber('');
      setAgreed(false);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Booking failed', ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='card'>
      {car.image && <img src={car.image} alt={car.name} />}
      <h3>
        {car.brand} {car.name}
      </h3>
      <p className='muted'>
        {car.type} · {car.seats} seats · {car.fuel} · {car.transmission}
      </p>
      <p>
        <strong>Rs {car.pricePerDay}</strong> / day
      </p>

      {!user && <button onClick={() => navigate('/login')}>Login to book</button>}

      {user && user.role !== 'customer' && (
        <p className='muted'>Log in as a customer to book this car.</p>
      )}

      {user && user.role === 'customer' && (
        <>
          <label className='muted'>From</label>
          <input
            type='date'
            min={today}
            value={dates.startDate}
            onChange={(e) => setDates({ ...dates, startDate: e.target.value })}
          />
          <label className='muted'>To</label>
          <input
            type='date'
            min={dates.startDate || today}
            value={dates.endDate}
            onChange={(e) => setDates({ ...dates, endDate: e.target.value })}
          />
          <input
            placeholder='Driving licence number'
            value={licenceNumber}
            onChange={(e) => setLicenceNumber(e.target.value)}
          />
          <label className='muted'>
            <input type='checkbox' checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />I
            accept the rental agreement: 100 km/h speed limit, I pay for damage and fines, the car is
            GPS tracked, and illegal use will be reported.
          </label>

          {days > 0 && (
            <p>
              {days} day(s) · estimated total <strong>Rs {days * car.pricePerDay}</strong>
            </p>
          )}

          <button onClick={book} disabled={!ready || busy}>
            {busy ? 'Booking...' : 'Book now'}
          </button>
          {msg.text && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}
        </>
      )}
    </div>
  );
}

export default function Cars() {
  const [cars, setCars] = useState([]);
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/cars')
      .then((res) => setCars(res.data))
      .catch(() => setError('Could not load cars. Is the server running?'))
      .finally(() => setLoading(false));
  }, []);

  const types = ['all', ...new Set(cars.map((c) => c.type).filter(Boolean))];
  const shown = type === 'all' ? cars : cars.filter((c) => c.type === type);

  return (
    <div>
      <h2>Available cars</h2>

      <select value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 200 }}>
        {types.map((t) => (
          <option key={t} value={t}>
            {t === 'all' ? 'All types' : t}
          </option>
        ))}
      </select>

      {loading && <p className='muted'>Loading cars...</p>}
      {error && <p className='error'>{error}</p>}
      {!loading && !error && shown.length === 0 && <p className='muted'>No cars found.</p>}

      <div className='grid'>
        {shown.map((car) => (
          <CarCard key={car._id} car={car} />
        ))}
      </div>
    </div>
  );
}