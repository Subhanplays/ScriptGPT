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

  useEffect(() => {
    loadModels();
    loadUsage();
  }, []);

  const loadModels = async () => {
    try {
      const data = await api.get<GeminiModel[]>('/gemini/models');
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadUsage = async () => {
    try {
      const data = await api.get<any>('/auth/me');
      setUsage(data?.usage);
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/users/gemini-key', {
        geminiApiKey: geminiKey || undefined,
        geminiModel,
      });
      setKeyConfigured(true);
      await refreshUser();
      toast.success('Settings saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#212121' }}>
      <header className="h-12 flex items-center px-4 gap-3 border-b border-[#2a2a2a]">
        <button onClick={() => navigate('/')} className="text-[#868e96] hover:text-[#dee2e6] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-medium text-[#e5e7eb]">Settings</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Gemini API Settings */}
        <div className="rounded-xl border border-[#2a2a2a] p-6" style={{ background: '#2a2a2a' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#4c6ef5' }}>
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Gemini API Settings</h2>
              <p className="text-sm text-[#868e96]">Configure your own Gemini API key</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#b0b8c1] mb-2">Gemini API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#495057]" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => { setGeminiKey(e.target.value); setKeyConfigured(false); }}
                  className="w-full pl-10 pr-10 px-4 py-3 rounded-xl text-white placeholder:text-[#495057] outline-none text-sm border border-[#3a3a3a] focus:border-[#555] transition-colors"
                  style={{ background: '#1a1a1a' }}
                  placeholder="Enter your Gemini API key..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#495057] hover:text-[#868e96] transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[#495057] mt-2">
                Your key is stored securely. Get yours at{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#748ffc] hover:underline">
                  Google AI Studio
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm text-[#b0b8c1] mb-2">Model</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white outline-none text-sm border border-[#3a3a3a] focus:border-[#555] transition-colors appearance-none"
                style={{ background: '#1a1a1a' }}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50"
              style={{ background: '#4c6ef5' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : keyConfigured ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {keyConfigured ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="rounded-xl border border-[#2a2a2a] p-6" style={{ background: '#2a2a2a' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#4c6ef5' }}>
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Usage</h2>
              <p className="text-sm text-[#868e96]">Your current usage limits</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#868e96]">Daily</span>
                <span className="text-[#b0b8c1]">{usage?.dailyUsed || 0} / {usage?.dailyLimit || 50}</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: '#1a1a1a' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(((usage?.dailyUsed || 0) / (usage?.dailyLimit || 50)) * 100, 100)}%`, background: '#4c6ef5' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#868e96]">Monthly</span>
                <span className="text-[#b0b8c1]">{usage?.monthlyUsed || 0} / {usage?.monthlyLimit || 1000}</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: '#1a1a1a' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(((usage?.monthlyUsed || 0) / (usage?.monthlyLimit || 1000)) * 100, 100)}%`, background: '#4c6ef5' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
