import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { DashboardStats, AdminUser, Conversation, SystemLog } from '../types';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Users, MessageSquare, Activity, BarChart3, Settings,
  Shield, Terminal, Trash2, Edit2, Plus, Eye, EyeOff, Key, Save,
  ChevronDown, X, FileText, Cpu, Clock, TrendingUp
} from 'lucide-react';

type Tab = 'dashboard' | 'users' | 'conversations' | 'usage' | 'settings' | 'logs';

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [limits, setLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', username: '', password: '', role: 'USER', dailyLimit: 50, monthlyLimit: 1000 });

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  const loadTab = async (t: Tab) => {
    setLoading(true);
    try {
      switch (t) {
        case 'dashboard':
          const dash = await api.get<DashboardStats>('/admin/dashboard');
          setDashboard(dash);
          break;
        case 'users':
          const u = await api.get<AdminUser[]>('/admin/users');
          setUsers(u);
          break;
        case 'conversations':
          const c = await api.get<Conversation[]>('/admin/conversations');
          setConversations(c);
          break;
        case 'usage':
          const ul = await api.get<any[]>('/admin/usage');
          setUsageLogs(ul);
          break;
        case 'settings':
          const s = await api.get<Record<string, string>>('/admin/settings');
          const l = await api.get<any[]>('/admin/limits');
          setSettings(s);
          setLimits(l);
          break;
        case 'logs':
          const lg = await api.get<SystemLog[]>('/admin/logs');
          setLogs(lg);
          break;
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleLimitsChange = async (userId: string, daily: number, monthly: number) => {
    try {
      await api.put(`/admin/users/${userId}/limits`, { dailyLimit: daily, monthlyLimit: monthly });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, dailyLimit: daily, monthlyLimit: monthly } : u)));
      toast.success('Limits updated');
    } catch {
      toast.error('Failed to update limits');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.post('/admin/create-user', newUser);
      setShowCreateUser(false);
      setNewUser({ email: '', username: '', password: '', role: 'USER', dailyLimit: 50, monthlyLimit: 1000 });
      loadTab('users');
      toast.success('User created');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/admin/settings', settings);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleSaveLimits = async (role: string, daily: number, monthly: number) => {
    try {
      await api.put(`/admin/limits/${role}`, { dailyLimit: daily, monthlyLimit: monthly });
      toast.success('Limits updated');
    } catch {
      toast.error('Failed to update limits');
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'usage', label: 'Usage', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logs', label: 'Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="h-14 border-b border-dark-700 flex items-center px-4 gap-3">
        <button onClick={() => navigate('/')} className="text-dark-400 hover:text-dark-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-scriptgpt-500" />
          <h1 className="text-lg font-semibold text-dark-50">Admin Panel</h1>
        </div>
        <div className="flex-1" />
        <span className="text-sm text-dark-400">{user?.username}</span>
      </header>

      <div className="flex">
        <nav className="w-56 border-r border-dark-700 p-3 hidden md:block min-h-[calc(100vh-3.5rem)]">
          <div className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  tab === t.id
                    ? 'bg-scriptgpt-600/10 text-scriptgpt-400 border border-scriptgpt-600/20'
                    : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto min-h-[calc(100vh-3.5rem)]">
          <div className="md:hidden p-2 border-b border-dark-700 flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-scriptgpt-600/10 text-scriptgpt-400'
                    : 'text-dark-400 hover:bg-dark-800'
                }`}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-scriptgpt-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {tab === 'dashboard' && dashboard && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-dark-50">Dashboard</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Users', value: dashboard.totalUsers, icon: Users, color: 'text-blue-400' },
                        { label: 'Conversations', value: dashboard.totalConversations, icon: MessageSquare, color: 'text-green-400' },
                        { label: 'Total Messages', value: dashboard.totalMessages, icon: Terminal, color: 'text-purple-400' },
                        { label: 'Today\'s Requests', value: dashboard.dailyUsage, icon: TrendingUp, color: 'text-yellow-400' },
                      ].map((stat, i) => (
                        <div key={i} className="card">
                          <div className="flex items-center gap-3">
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            <div>
                              <p className="text-2xl font-bold text-dark-50">{stat.value}</p>
                              <p className="text-xs text-dark-400">{stat.label}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="card">
                        <h3 className="font-semibold text-dark-50 mb-3">Recent Users</h3>
                        <div className="space-y-2">
                          {dashboard.recentUsers.map((u) => (
                            <div key={u.id} className="flex items-center justify-between p-2 bg-dark-800 rounded-lg">
                              <span className="text-sm text-dark-200">{u.username}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                u.role === 'ADMIN' ? 'bg-scriptgpt-600/20 text-scriptgpt-400' : 'bg-dark-700 text-dark-400'
                              }`}>
                                {u.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="card">
                        <h3 className="font-semibold text-dark-50 mb-3">Usage by Provider</h3>
                        <div className="space-y-2">
                          {dashboard.usageByProvider.map((p) => (
                            <div key={p.aiProvider} className="flex items-center justify-between p-2 bg-dark-800 rounded-lg">
                              <span className="text-sm text-dark-200">{p.aiProvider}</span>
                              <span className="text-sm font-mono text-dark-400">{p._count} requests</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'users' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-dark-50">Users</h2>
                      <button onClick={() => setShowCreateUser(true)} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" />
                        Create User
                      </button>
                    </div>

                    {showCreateUser && (
                      <div className="card">
                        <h3 className="font-semibold text-dark-50 mb-4">Create New User</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            className="input-field"
                            placeholder="Email"
                          />
                          <input
                            value={newUser.username}
                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                            className="input-field"
                            placeholder="Username"
                          />
                          <input
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            className="input-field"
                            placeholder="Password"
                          />
                          <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            className="input-field"
                          >
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <input
                            type="number"
                            value={newUser.dailyLimit}
                            onChange={(e) => setNewUser({ ...newUser, dailyLimit: parseInt(e.target.value) })}
                            className="input-field"
                            placeholder="Daily limit"
                          />
                          <input
                            type="number"
                            value={newUser.monthlyLimit}
                            onChange={(e) => setNewUser({ ...newUser, monthlyLimit: parseInt(e.target.value) })}
                            className="input-field"
                            placeholder="Monthly limit"
                          />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button onClick={handleCreateUser} className="btn-primary text-sm">Create</button>
                          <button onClick={() => setShowCreateUser(false)} className="btn-secondary text-sm">Cancel</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {users.map((u) => (
                        <div key={u.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-dark-50">{u.username}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                u.role === 'ADMIN' ? 'bg-scriptgpt-600/20 text-scriptgpt-400' : 'bg-dark-700 text-dark-400'
                              }`}>
                                {u.role}
                              </span>
                            </div>
                            <p className="text-sm text-dark-400">{u.email}</p>
                            <p className="text-xs text-dark-500 mt-1">
                              {u._count.conversations} conversations, {u._count.usageLogs} requests
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="input-field py-1 px-2 text-xs"
                            >
                              <option value="USER">User</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            <input
                              type="number"
                              value={u.dailyLimit}
                              onChange={(e) => handleLimitsChange(u.id, parseInt(e.target.value), u.monthlyLimit)}
                              className="input-field py-1 px-2 text-xs w-20"
                              title="Daily limit"
                            />
                            <input
                              type="number"
                              value={u.monthlyLimit}
                              onChange={(e) => handleLimitsChange(u.id, u.dailyLimit, parseInt(e.target.value))}
                              className="input-field py-1 px-2 text-xs w-20"
                              title="Monthly limit"
                            />
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'conversations' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-dark-50">Conversations</h2>
                    <div className="space-y-3">
                      {conversations.map((c) => (
                        <div key={c.id} className="card flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-dark-50 text-sm">{c.title}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-400">
                                {c.aiProvider}
                              </span>
                            </div>
                            <p className="text-xs text-dark-500 mt-1">
                              {c.user?.username} &middot; {c._count?.messages || 0} messages &middot;{' '}
                              {new Date(c.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'usage' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-dark-50">Usage Logs</h2>
                    <div className="space-y-2">
                      {usageLogs.map((log) => (
                        <div key={log.id} className="card py-3 px-4 flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-dark-200">{log.user?.username}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-400">
                                {log.aiProvider}
                              </span>
                              <span className="text-xs text-dark-500">{log.requestType}</span>
                            </div>
                            <p className="text-xs text-dark-500 mt-0.5">
                              {log.totalTokens} tokens &middot; {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'settings' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-dark-50">System Settings</h2>
                    <div className="card">
                      <div className="flex items-center gap-2 mb-4">
                        <Cpu className="w-5 h-5 text-scriptgpt-500" />
                        <h3 className="font-semibold text-dark-50">ScriptGPT AI Configuration</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-dark-300 mb-1">Admin Gemini API Key</label>
                          <input
                            type="password"
                            value={settings.ADMIN_GEMINI_KEY || ''}
                            onChange={(e) => setSettings({ ...settings, ADMIN_GEMINI_KEY: e.target.value })}
                            className="input-field w-full"
                            placeholder="Enter admin Gemini API key..."
                          />
                          <p className="text-xs text-dark-500 mt-1">Used for ScriptGPT AI mode (built-in AI)</p>
                        </div>
                        <button onClick={handleSaveSettings} className="btn-primary flex items-center gap-2 text-sm">
                          <Save className="w-4 h-4" />
                          Save Settings
                        </button>
                      </div>
                    </div>

                    <div className="card">
                      <h3 className="font-semibold text-dark-50 mb-4">Default Usage Limits</h3>
                      <div className="space-y-3">
                        {limits.map((l) => (
                          <div key={l.role} className="flex items-center gap-4 p-3 bg-dark-800 rounded-lg">
                            <span className="font-medium text-dark-200 w-20">{l.role}</span>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-dark-400">Daily:</label>
                              <input
                                type="number"
                                defaultValue={l.dailyLimit}
                                id={`daily-${l.role}`}
                                className="input-field py-1 px-2 text-sm w-24"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-dark-400">Monthly:</label>
                              <input
                                type="number"
                                defaultValue={l.monthlyLimit}
                                id={`monthly-${l.role}`}
                                className="input-field py-1 px-2 text-sm w-24"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const daily = (document.getElementById(`daily-${l.role}`) as HTMLInputElement).value;
                                const monthly = (document.getElementById(`monthly-${l.role}`) as HTMLInputElement).value;
                                handleSaveLimits(l.role, parseInt(daily), parseInt(monthly));
                              }}
                              className="btn-secondary text-xs py-1"
                            >
                              Save
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'logs' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-dark-50">System Logs</h2>
                    <div className="space-y-2">
                      {logs.length === 0 ? (
                        <p className="text-dark-400 text-center py-10">No logs yet</p>
                      ) : (
                        logs.map((log) => (
                          <div key={log.id} className="card py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                                log.level === 'error' ? 'bg-red-600/20 text-red-400' :
                                log.level === 'warn' ? 'bg-yellow-600/20 text-yellow-400' :
                                'bg-dark-700 text-dark-400'
                              }`}>
                                {log.level.toUpperCase()}
                              </span>
                              <span className="text-sm text-dark-200">{log.message}</span>
                            </div>
                            <p className="text-xs text-dark-500 mt-1">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
