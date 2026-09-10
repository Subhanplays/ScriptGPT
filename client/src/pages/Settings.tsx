import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { GeminiModel } from '../types';
import toast from 'react-hot-toast';
import { ArrowLeft, Key, Cpu, Save, Eye, EyeOff, CheckCircle, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState(user?.geminiModel || 'gemini-2.0-flash');
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => { loadModels(); loadUsage(); }, []);

  const loadModels = async () => { try { setModels(await api.get<GeminiModel[]>('/gemini/models')); } catch {} };
  const loadUsage = async () => { try { const d = await api.get<any>('/auth/me'); setUsage(d?.usage); } catch {} };

  const handleSave = async () => {
    setLoading(true);
    try { await api.put('/users/gemini-key', { geminiApiKey: geminiKey || undefined, geminiModel }); setKeyConfigured(true); await refreshUser(); toast.success('Saved!'); }
    catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>
      <header className="h-12 flex items-center px-4 gap-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => navigate('/')} style={{ color: '#6b7280' }}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-sm font-medium" style={{ color: '#111827' }}>Settings</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="rounded-xl p-6" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10a37f' }}>
              <Cpu className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#111827' }}>Gemini API Settings</h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>Configure your own Gemini API key</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>Gemini API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input type={showKey ? 'text' : 'password'} value={geminiKey} onChange={(e) => { setGeminiKey(e.target.value); setKeyConfigured(false); }} className="w-full pl-10 pr-10 px-4 py-3 rounded-xl outline-none text-sm" style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }} placeholder="Enter your Gemini API key..." />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }}>
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                Your key is stored securely. Get yours at{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#10a37f' }}>Google AI Studio</a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>Model</label>
              <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none text-sm appearance-none" style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' }}>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name} - {m.description}</option>)}
              </select>
            </div>

            <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm" style={{ background: '#10a37f' }}>
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : keyConfigured ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {keyConfigured ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="rounded-xl p-6" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10a37f' }}>
              <Key className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#111827' }}>Usage</h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>Your current usage limits</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: '#6b7280' }}>Daily</span>
                <span style={{ color: '#374151' }}>{usage?.dailyUsed || 0} / {usage?.dailyLimit || 50}</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: '#e5e7eb' }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(((usage?.dailyUsed || 0) / (usage?.dailyLimit || 50)) * 100, 100)}%`, background: '#10a37f' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: '#6b7280' }}>Monthly</span>
                <span style={{ color: '#374151' }}>{usage?.monthlyUsed || 0} / {usage?.monthlyLimit || 1000}</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: '#e5e7eb' }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(((usage?.monthlyUsed || 0) / (usage?.monthlyLimit || 1000)) * 100, 100)}%`, background: '#10a37f' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
