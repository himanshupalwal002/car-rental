import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await api.post(url, payload);
      login(data);
      if (data.user.role === 'owner') navigate('/owner');
      else if (data.user.role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server');
    }
  };

  return (
    <form onSubmit={submit} className='card form-narrow'>
      <h2>{isRegister ? 'Create an account' : 'Login'}</h2>

      {isRegister && (
        <>
          <input name='name' placeholder='Your name' value={form.name} onChange={change} required />
          <select name='role' value={form.role} onChange={change}>
            <option value='customer'>I want to rent cars</option>
            <option value='owner'>I own cars to rent out</option>
          </select>
        </>
      )}

      <input
        name='email'
        type='email'
        placeholder='Email'
        value={form.email}
        onChange={change}
        required
      />
      <input
        name='password'
        type='password'
        placeholder='Password'
        value={form.password}
        onChange={change}
        required
      />

      {error && <p className='error'>{error}</p>}

      <button type='submit'>{isRegister ? 'Register' : 'Login'}</button>
      <p className='muted'>
        {isRegister ? 'Already have an account? ' : 'New here? '}
        <a
          href='#'
          onClick={(e) => {
            e.preventDefault();
            setIsRegister(!isRegister);
            setError('');
          }}
        >
          {isRegister ? 'Login' : 'Register'}
        </a>
      </p>
    </form>
  );
}