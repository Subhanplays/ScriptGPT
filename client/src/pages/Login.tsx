import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Terminal, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#ffffff' }}>
      <div className="w-full max-w-sm page-transition">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 animate-scale-in" style={{ background: '#10a37f', boxShadow: '0 4px 20px rgba(16, 163, 127, 0.3)' }}>
            <Terminal className="w-7 h-7" style={{ color: '#fff' }} />
          </div>
          <h1 className="text-2xl font-bold animate-slide-up" style={{ color: '#111827' }}>Welcome back</h1>
          <p className="mt-1.5 text-sm animate-slide-up" style={{ color: '#6b7280', animationDelay: '0.05s' }}>Sign in to continue to ScriptGPT</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl outline-none text-sm"
              style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }}
              placeholder="Email address"
              required
            />
          </div>
          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 rounded-xl outline-none text-sm"
                style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }}
                placeholder="Password"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50"
            style={{ background: '#10a37f' }}
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Continue'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: '#6b7280' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#10a37f' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
