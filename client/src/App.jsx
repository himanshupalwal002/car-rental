import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './pages/Login';
import Cars from './pages/Cars';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';
import OwnerDashboard from './pages/OwnerDashboard';

export default function App() {
  const { user, logout } = useAuth();

  return (
    <>
      <nav>
        <Link to='/'>Cars</Link>
        {user && user.role === 'customer' && <Link to='/my-bookings'>My Bookings</Link>}
        {user && user.role === 'owner' && <Link to='/owner'>My Vehicles</Link>}
        {user && user.role === 'admin' && <Link to='/admin'>Admin</Link>}
        <div className='right'>
          {user ? (
            <>
              <span>
                Hi, {user.name} ({user.role})
              </span>
              <button className='secondary' onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link to='/login'>Login</Link>
          )}
        </div>
      </nav>

      <div className='container'>
        <Routes>
          <Route path='/' element={<Cars />} />
          <Route path='/login' element={<Login />} />
          <Route path='/my-bookings' element={user ? <MyBookings /> : <Navigate to='/login' />} />
          <Route
            path='/owner'
            element={user && user.role === 'owner' ? <OwnerDashboard /> : <Navigate to='/' />}
          />
          <Route
            path='/admin'
            element={user && user.role === 'admin' ? <Admin /> : <Navigate to='/' />}
          />
        </Routes>
      </div>
    </>
  );
}