import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Terminal, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register(email, username, password);
      toast.success('Account created!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#ffffff' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ background: '#10a37f' }}>
            <Terminal className="w-6 h-6" style={{ color: '#fff' }} />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>Create your account</h1>
          <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>Get started with ScriptGPT</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none text-sm" style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }} placeholder="Email address" required />
          </div>
          <div>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none text-sm" style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }} placeholder="Username" required />
          </div>
          <div>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 pr-10 rounded-xl outline-none text-sm" style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }} placeholder="Password" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none text-sm" style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }} placeholder="Confirm password" required minLength={6} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50" style={{ background: '#10a37f' }}>
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Create account'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#10a37f' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
