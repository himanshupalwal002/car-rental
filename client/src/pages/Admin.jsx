import { useEffect, useState } from 'react';
import api from '../api';
import { useDialog } from '../useDialog';

const fmt = (d) => new Date(d).toLocaleDateString();
const label = (t) => t.replace(/_/g, ' ');
const CHARGE_TYPES = [
  'minor_damage',
  'major_damage',
  'accident',
  'traffic_challan',
  'illegal_use',
  'other',
];

export default function Admin() {
  const { ask, dialog } = useDialog();
  const [bookings, setBookings] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [settled, setSettled] = useState(null);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState({
    bookingId: '',
    type: 'minor_damage',
    description: '',
    amount: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [b, p] = await Promise.all([api.get('/bookings'), api.get('/penalties')]);
        setBookings(b.data);
        setPenalties(p.data);
      } catch (err) {
        setMsg({ text: err.response?.data?.message || 'Could not load data', ok: false });
      }
    };
    load();
  }, [version]);

  const reload = () => setVersion((v) => v + 1);

  const tell = (text, ok = true) => {
    setMsg({ text, ok });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const run = async (request, okText) => {
    try {
      await request();
      tell(okText);
      reload();
    } catch (err) {
      tell(err.response?.data?.message || 'Something went wrong', false);
    }
  };

  const pickup = async (id) => {
    const notes = await ask({
      title: 'Mark the car as picked up',
      message: 'Add a note about the condition of the car.',
      input: true,
      defaultValue: 'No scratches at pickup',
      confirmText: 'Mark picked up',
    });
    if (notes === null) return;
    run(
      () => api.put('/bookings/' + id + '/pickup', { notes, photos: [] }),
      'Car marked as picked up'
    );
  };

  const cancel = async (id) => {
    const ok = await ask({ title: 'Cancel this booking?', confirmText: 'Cancel booking' });
    if (!ok) return;
    run(() => api.put('/bookings/' + id + '/cancel'), 'Booking cancelled');
  };

  const settle = async (id) => {
    const ok = await ask({
      title: 'Settle this booking?',
      message: 'Approved charges are taken from the deposit and the booking is closed.',
      confirmText: 'Settle',
    });
    if (!ok) return;
    try {
      const { data } = await api.post('/penalties/settle/' + id);
      setSettled(data);
      tell('Booking settled');
      reload();
    } catch (err) {
      tell(err.response?.data?.message || 'Could not settle', false);
    }
  };

  const approve = async (p) => {
    const answer = await ask({
      title: 'Approve this charge',
      message: 'Amount to charge (Rs). You can change it.',
      input: true,
      defaultValue: String(p.amount),
      confirmText: 'Approve',
    });
    if (answer === null) return;
    const amount = Number(answer);
    if (answer.trim() === '' || isNaN(amount) || amount < 0) {
      return tell('Enter a valid amount', false);
    }
    run(
      () => api.put('/penalties/' + p._id + '/resolve', { status: 'approved', amount }),
      'Charge approved'
    );
  };

  const waive = (p) => {
    run(() => api.put('/penalties/' + p._id + '/resolve', { status: 'waived' }), 'Charge waived');
  };

  const block = async (userId) => {
    const reason = await ask({
      title: 'Block this customer',
      message: 'They will not be able to make new bookings. Reason:',
      input: true,
      confirmText: 'Block',
    });
    if (!reason) return;
    run(() => api.put('/penalties/blacklist/' + userId, { reason }), 'Customer blocked');
  };

  const addCharge = (e) => {
    e.preventDefault();
    const body = { bookingId: form.bookingId, type: form.type, description: form.description };
    if (form.amount !== '') body.amount = Number(form.amount);
    run(() => api.post('/penalties', body), 'Charge created (pending)');
    setForm({ ...form, description: '', amount: '' });
  };

  const usable = bookings.filter((b) => b.status !== 'cancelled');

  return (
    <div>
      <h2>Admin panel</h2>
      {msg.text && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}

      {settled && (
        <div className='card'>
          <h3>Settlement result</h3>
          <p>
            Total charges: <strong>Rs {settled.totalPenalties}</strong>
          </p>
          <p>Taken from the deposit: Rs {settled.deductedFromDeposit}</p>
          <p>Customer still owes: Rs {settled.extraAmountDue}</p>
          <p>Deposit refunded: Rs {settled.depositRefund}</p>
          <button className='secondary small' onClick={() => setSettled(null)}>
            Close
          </button>
        </div>
      )}

      <h2>All bookings</h2>
      {bookings.length === 0 && <p className='muted'>No bookings yet.</p>}
      {bookings.length > 0 && (
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Car</th>
                <th>Dates</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>{b.user ? b.user.name : 'Unknown'}</td>
                  <td>{b.car ? b.car.name : 'Car removed'}</td>
                  <td>
                    {fmt(b.startDate)} to {fmt(b.endDate)}
                  </td>
                  <td>Rs {b.totalPrice}</td>
                  <td>
                    <span className='badge'>{b.status}</span>
                  </td>
                  <td>
                    <div className='row'>
                      {b.status === 'confirmed' && (
                        <button className='small' onClick={() => pickup(b._id)}>
                          Pickup
                        </button>
                      )}
                      {b.status === 'active' && (
                        <button className='small' onClick={() => settle(b._id)}>
                          Settle
                        </button>
                      )}
                      {(b.status === 'confirmed' || b.status === 'active') && (
                        <button className='danger small' onClick={() => cancel(b._id)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Add a charge</h2>
      <form onSubmit={addCharge} className='card'>
        <div className='inline-form'>
          <select
            value={form.bookingId}
            onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
            required
          >
            <option value=''>Choose a booking</option>
            {usable.map((b) => (
              <option key={b._id} value={b._id}>
                {b.user ? b.user.name : 'User'} · {b.car ? b.car.name : 'Car'} · {fmt(b.startDate)} ·{' '}
                {b.status}
              </option>
            ))}
          </select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {CHARGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </select>
          <input
            placeholder='Description'
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            type='number'
            min='0'
            placeholder='Amount (blank = default)'
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <button type='submit'>Add charge</button>
        </div>
        <p className='muted' style={{ marginTop: 10 }}>
          Damage types have a default amount. Accident, challan, illegal use and other need an
          amount.
        </p>
      </form>

      <h2>All charges</h2>
      {penalties.length === 0 && <p className='muted'>No charges yet.</p>}
      {penalties.length > 0 && (
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Car</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {penalties.map((p) => (
                <tr key={p._id}>
                  <td>{p.user ? p.user.name : 'Unknown'}</td>
                  <td>{p.car ? p.car.name : 'Car'}</td>
                  <td>{label(p.type)}</td>
                  <td>Rs {p.amount}</td>
                  <td>
                    <span className='badge'>{p.status}</span>
                  </td>
                  <td>
                    {p.description}
                    {p.status === 'disputed' && p.disputeReason && (
                      <span className='muted'> · Customer says: {p.disputeReason}</span>
                    )}
                  </td>
                  <td>
                    <div className='row'>
                      {['pending', 'disputed', 'approved'].includes(p.status) && (
                        <>
                          <button className='small' onClick={() => approve(p)}>
                            Approve
                          </button>
                          <button className='secondary small' onClick={() => waive(p)}>
                            Waive
                          </button>
                        </>
                      )}
                      {p.user && (
                        <button className='danger small' onClick={() => block(p.user._id)}>
                          Block
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog}
    </div>
  );
}