import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const fmt = (d) => new Date(d).toLocaleDateString();

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [msg, setMsg] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [b, p] = await Promise.all([api.get('/bookings/my'), api.get('/penalties/my')]);
        setBookings(b.data);
        setPenalties(p.data);
      } catch (err) {
        setMsg(err.response?.data?.message || 'Could not load your data');
      }
    };
    load();
  }, [version]);

  const reload = () => setVersion((v) => v + 1);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await api.put('/bookings/' + id + '/cancel');
      setMsg('Booking cancelled');
      reload();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not cancel');
    }
  };

  const dispute = async (id) => {
    const reason = window.prompt('Why do you dispute this charge?');
    if (!reason) return;
    try {
      await api.put('/penalties/' + id + '/dispute', { reason });
      setMsg('Dispute sent to the admin');
      reload();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not dispute');
    }
  };

  return (
    <div>
      <h2>My bookings</h2>
      {msg && <p className='muted'>{msg}</p>}

      {bookings.length === 0 && (
        <p className='muted'>
          No bookings yet. <Link to='/'>Browse cars</Link>
        </p>
      )}

      {bookings.map((b) => (
        <div key={b._id} className='card'>
          <h3>
            {b.car ? b.car.name : 'Car removed'} <span className='badge'>{b.status}</span>
          </h3>
          <p>
            {fmt(b.startDate)} to {fmt(b.endDate)}
          </p>
          <p className='muted'>
            Total Rs {b.totalPrice} · Deposit Rs {b.depositAmount}
          </p>
          {b.status === 'confirmed' && (
            <button className='danger' onClick={() => cancel(b._id)}>
              Cancel booking
            </button>
          )}
        </div>
      ))}

      <h2 style={{ marginTop: 32 }}>My charges</h2>
      {penalties.length === 0 && <p className='muted'>No charges.</p>}

      {penalties.map((p) => (
        <div key={p._id} className='card'>
          <h3>
            {p.type.replace('_', ' ')} · Rs {p.amount} <span className='badge'>{p.status}</span>
          </h3>
          <p className='muted'>
            {p.car ? p.car.name : 'Car'} · {p.description || 'No description'}
          </p>
          {p.status === 'disputed' && <p className='muted'>Your reason: {p.disputeReason}</p>}
          {(p.status === 'pending' || p.status === 'approved') && (
            <button className='secondary' onClick={() => dispute(p._id)}>
              Dispute
            </button>
          )}
        </div>
      ))}
    </div>
  );
}