import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VantaBackground from './common/VantaBackground';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/venues');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <VantaBackground className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 p-8">
        {/* HEADER */}
        <div className="text-center mb-8">
          <img
            src="/logo/amrita-emblem.png"
            alt="Amrita Vishwa Vidyapeetham"
            className="h-16 mx-auto mb-3"
          />
          <h1 className="text-2xl font-serif font-bold text-slate-900">
            Amrita BookMyVenue
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Log in with your university campus credentials
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
            >
              Campus Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@amrita.edu"
              required
              className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 pr-10 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-stone-400 hover:text-stone-700 transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-slate-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* SIGNUP LINK */}
        <div className="mt-6 pt-5 border-t border-stone-100 text-center text-sm text-stone-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-amber-700 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </VantaBackground>
  );
}

export default LoginPage;