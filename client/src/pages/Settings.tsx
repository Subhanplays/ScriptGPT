import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { GeminiModel } from '../types';
import toast from 'react-hot-toast';
import { ArrowLeft, Key, Cpu, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
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

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const data = await api.get<GeminiModel[]>('/gemini/models');
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
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
    <div className="min-h-screen bg-dark-950">
      <header className="h-14 border-b border-dark-700 flex items-center px-4 gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-dark-400 hover:text-dark-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-dark-50">Settings</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-scriptgpt-600/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-scriptgpt-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-50">Gemini API Settings</h2>
              <p className="text-sm text-dark-400">Configure your own Gemini API key</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Gemini API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    setKeyConfigured(false);
                  }}
                  className="input-field w-full pl-10 pr-10"
                  placeholder="Enter your Gemini API key..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-dark-500 mt-1.5">
                Your API key is stored securely and never shared. Get yours at{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-scriptgpt-400 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Model
              </label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="input-field w-full"
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
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : keyConfigured ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {keyConfigured ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-scriptgpt-600/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-scriptgpt-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-50">Usage</h2>
              <p className="text-sm text-dark-400">Your current usage limits</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-dark-400">Daily</span>
                <span className="text-dark-300">{usage?.dailyUsed || 0} / {usage?.dailyLimit || 50}</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div
                  className="bg-scriptgpt-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(((usage?.dailyUsed || 0) / (usage?.dailyLimit || 50)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-dark-400">Monthly</span>
                <span className="text-dark-300">{usage?.monthlyUsed || 0} / {usage?.monthlyLimit || 1000}</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div
                  className="bg-scriptgpt-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(((usage?.monthlyUsed || 0) / (usage?.monthlyLimit || 1000)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
