import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { DashboardStats, AdminUser, Conversation, SystemLog } from '../types';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Users, MessageSquare, Activity, BarChart3, Settings,
  Shield, Terminal, Trash2, Plus, Save, FileText, Cpu, TrendingUp
} from 'lucide-react';

type Tab = 'dashboard' | 'users' | 'conversations' | 'usage' | 'settings' | 'logs';

export default function Admin() {
  const { user } = useAuth();
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

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t: Tab) => {
    setLoading(true);
    try {
      switch (t) {
        case 'dashboard': setDashboard(await api.get<DashboardStats>('/admin/dashboard')); break;
        case 'users': setUsers(await api.get<AdminUser[]>('/admin/users')); break;
        case 'conversations': setConversations(await api.get<Conversation[]>('/admin/conversations')); break;
        case 'usage': setUsageLogs(await api.get<any[]>('/admin/usage')); break;
        case 'settings': {
          const s = await api.get<Record<string, string>>('/admin/settings');
          const l = await api.get<any[]>('/admin/limits');
          setSettings(s); setLimits(l); break;
        }
        case 'logs': setLogs(await api.get<SystemLog[]>('/admin/logs')); break;
      }
    } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try { await api.put(`/admin/users/${userId}/role`, { role }); setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u)); toast.success('Role updated'); } catch { toast.error('Failed'); }
  };

  const handleLimitsChange = async (userId: string, daily: number, monthly: number) => {
    try { await api.put(`/admin/users/${userId}/limits`, { dailyLimit: daily, monthlyLimit: monthly }); setUsers(prev => prev.map(u => u.id === userId ? { ...u, dailyLimit: daily, monthlyLimit: monthly } : u)); toast.success('Limits updated'); } catch { toast.error('Failed'); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure?')) return;
    try { await api.delete(`/admin/users/${userId}`); setUsers(prev => prev.filter(u => u.id !== userId)); toast.success('User deleted'); } catch { toast.error('Failed'); }
  };

  const handleCreateUser = async () => {
    try { await api.post('/admin/create-user', newUser); setShowCreateUser(false); setNewUser({ email: '', username: '', password: '', role: 'USER', dailyLimit: 50, monthlyLimit: 1000 }); loadTab('users'); toast.success('User created'); } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const handleSaveSettings = async () => {
    try { await api.put('/admin/settings', settings); toast.success('Settings saved'); } catch { toast.error('Failed'); }
  };

  const handleSaveLimits = async (role: string, daily: number, monthly: number) => {
    try { await api.put(`/admin/limits/${role}`, { dailyLimit: daily, monthlyLimit: monthly }); toast.success('Limits updated'); } catch { toast.error('Failed'); }
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
    <div className="min-h-screen flex" style={{ background: '#212121' }}>
      {/* Sidebar */}
      <aside className="w-56 border-r border-[#2a2a2a] flex flex-col hidden md:flex" style={{ background: '#171717' }}>
        <div className="flex items-center gap-2 p-4 border-b border-[#2a2a2a]">
          <Shield className="w-4 h-4 text-[#4c6ef5]" />
          <span className="text-sm font-medium text-white">Admin Panel</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${tab === t.id ? 'bg-[#2a2a2a] text-white' : 'text-[#868e96] hover:bg-[#212121] hover:text-[#dee2e6]'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[#2a2a2a]">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-[#868e96] hover:bg-[#212121] hover:text-[#dee2e6] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </button>
        </div>
      </aside>

      {/* Mobile tabs */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden border-b border-[#2a2a2a] flex gap-1 p-2 overflow-x-auto" style={{ background: '#171717' }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap ${tab === t.id ? 'bg-[#2a2a2a] text-white' : 'text-[#868e96] hover:bg-[#212121]'}`}>
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#4c6ef5] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Dashboard */}
              {tab === 'dashboard' && dashboard && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-white">Dashboard</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Users', value: dashboard.totalUsers, icon: Users, color: '#748ffc' },
                      { label: 'Conversations', value: dashboard.totalConversations, icon: MessageSquare, color: '#51cf66' },
                      { label: 'Total Messages', value: dashboard.totalMessages, icon: Terminal, color: '#cc5de8' },
                      { label: "Today's Requests", value: dashboard.dailyUsage, icon: TrendingUp, color: '#fcc419' },
                    ].map((stat, i) => (
                      <div key={i} className="rounded-xl border border-[#2a2a2a] p-4" style={{ background: '#2a2a2a' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                            <p className="text-xs text-[#868e96]">{stat.label}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-[#2a2a2a] p-5" style={{ background: '#2a2a2a' }}>
                      <h3 className="font-medium text-white mb-3">Recent Users</h3>
                      <div className="space-y-2">
                        {dashboard.recentUsers.map((u) => (
                          <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#1a1a1a' }}>
                            <span className="text-sm text-[#dee2e6]">{u.username}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${u.role === 'ADMIN' ? 'text-[#748ffc]' : 'text-[#868e96]'}`} style={{ background: u.role === 'ADMIN' ? '#4c6ef520' : '#1a1a1a' }}>{u.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#2a2a2a] p-5" style={{ background: '#2a2a2a' }}>
                      <h3 className="font-medium text-white mb-3">Usage by Provider</h3>
                      <div className="space-y-2">
                        {dashboard.usageByProvider.map((p) => (
                          <div key={p.aiProvider} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#1a1a1a' }}>
                            <span className="text-sm text-[#dee2e6]">{p.aiProvider}</span>
                            <span className="text-sm text-[#868e96] font-mono">{p._count} requests</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Users */}
              {tab === 'users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Users</h2>
                    <button onClick={() => setShowCreateUser(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm" style={{ background: '#4c6ef5' }}>
                      <Plus className="w-4 h-4" /> Create User
                    </button>
                  </div>
                  {showCreateUser && (
                    <div className="rounded-xl border border-[#2a2a2a] p-5" style={{ background: '#2a2a2a' }}>
                      <h3 className="font-medium text-white mb-4">New User</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="px-3 py-2.5 rounded-xl text-white placeholder:text-[#495057] text-sm outline-none border border-[#3a3a3a] focus:border-[#555]" style={{ background: '#1a1a1a' }} placeholder="Email" />
                        <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="px-3 py-2.5 rounded-xl text-white placeholder:text-[#495057] text-sm outline-none border border-[#3a3a3a] focus:border-[#555]" style={{ background: '#1a1a1a' }} placeholder="Username" />
                        <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="px-3 py-2.5 rounded-xl text-white placeholder:text-[#495057] text-sm outline-none border border-[#3a3a3a] focus:border-[#555]" style={{ background: '#1a1a1a' }} placeholder="Password" />
                        <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="px-3 py-2.5 rounded-xl text-white text-sm outline-none border border-[#3a3a3a] focus:border-[#555]" style={{ background: '#1a1a1a' }}>
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={handleCreateUser} className="px-4 py-2 rounded-xl text-white text-sm" style={{ background: '#4c6ef5' }}>Create</button>
                        <button onClick={() => setShowCreateUser(false)} className="px-4 py-2 rounded-xl text-[#dee2e6] text-sm border border-[#3a3a3a] hover:bg-[#1a1a1a]">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div key={u.id} className="rounded-xl border border-[#2a2a2a] p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: '#2a2a2a' }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">{u.username}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${u.role === 'ADMIN' ? 'text-[#748ffc]' : 'text-[#868e96]'}`} style={{ background: u.role === 'ADMIN' ? '#4c6ef520' : '#1a1a1a' }}>{u.role}</span>
                          </div>
                          <p className="text-xs text-[#868e96] mt-0.5">{u.email}</p>
                          <p className="text-xs text-[#495057] mt-0.5">{u._count.conversations} conversations, {u._count.usageLogs} requests</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} className="px-2 py-1 rounded-lg text-xs text-white outline-none border border-[#3a3a3a]" style={{ background: '#1a1a1a' }}>
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <input type="number" value={u.dailyLimit} onChange={(e) => handleLimitsChange(u.id, parseInt(e.target.value), u.monthlyLimit)} className="px-2 py-1 rounded-lg text-xs text-white w-16 outline-none border border-[#3a3a3a]" style={{ background: '#1a1a1a' }} title="Daily limit" />
                          <input type="number" value={u.monthlyLimit} onChange={(e) => handleLimitsChange(u.id, u.dailyLimit, parseInt(e.target.value))} className="px-2 py-1 rounded-lg text-xs text-white w-16 outline-none border border-[#3a3a3a]" style={{ background: '#1a1a1a' }} title="Monthly limit" />
                          <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-[#495057] hover:text-[#ff6b6b] hover:bg-[#1a1a1a] rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversations */}
              {tab === 'conversations' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-white">Conversations</h2>
                  <div className="space-y-2">
                    {conversations.map((c) => (
                      <div key={c.id} className="rounded-xl border border-[#2a2a2a] p-4" style={{ background: '#2a2a2a' }}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm truncate">{c.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded text-[#868e96]" style={{ background: '#1a1a1a' }}>{c.aiProvider}</span>
                        </div>
                        <p className="text-xs text-[#868e96] mt-1">{c.user?.username} · {c._count?.messages || 0} messages · {new Date(c.updatedAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage */}
              {tab === 'usage' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-white">Usage Logs</h2>
                  <div className="space-y-2">
                    {usageLogs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-[#2a2a2a] p-4" style={{ background: '#2a2a2a' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#dee2e6]">{log.user?.username}</span>
                          <span className="text-xs px-2 py-0.5 rounded text-[#868e96]" style={{ background: '#1a1a1a' }}>{log.aiProvider}</span>
                          <span className="text-xs text-[#495057]">{log.requestType}</span>
                        </div>
                        <p className="text-xs text-[#868e96] mt-1">{log.totalTokens} tokens · {new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings */}
              {tab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-white">System Settings</h2>
                  <div className="rounded-xl border border-[#2a2a2a] p-5" style={{ background: '#2a2a2a' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Cpu className="w-5 h-5 text-[#4c6ef5]" />
                      <h3 className="font-medium text-white">ScriptGPT AI Configuration</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-[#b0b8c1] mb-2">Admin Gemini API Key</label>
                        <input type="password" value={settings.ADMIN_GEMINI_KEY || ''} onChange={(e) => setSettings({ ...settings, ADMIN_GEMINI_KEY: e.target.value })} className="w-full px-4 py-3 rounded-xl text-white placeholder:text-[#495057] text-sm outline-none border border-[#3a3a3a] focus:border-[#555]" style={{ background: '#1a1a1a' }} placeholder="Enter admin Gemini API key..." />
                        <p className="text-xs text-[#495057] mt-1">Used for ScriptGPT AI mode</p>
                      </div>
                      <button onClick={handleSaveSettings} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm" style={{ background: '#4c6ef5' }}>
                        <Save className="w-4 h-4" /> Save Settings
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#2a2a2a] p-5" style={{ background: '#2a2a2a' }}>
                    <h3 className="font-medium text-white mb-4">Default Usage Limits</h3>
                    <div className="space-y-3">
                      {limits.map((l) => (
                        <div key={l.role} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: '#1a1a1a' }}>
                          <span className="font-medium text-[#dee2e6] w-20 text-sm">{l.role}</span>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-[#868e96]">Daily:</label>
                            <input type="number" defaultValue={l.dailyLimit} id={`daily-${l.role}`} className="px-2 py-1 rounded-lg text-sm text-white w-20 outline-none border border-[#3a3a3a]" style={{ background: '#1a1a1a' }} />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-[#868e96]">Monthly:</label>
                            <input type="number" defaultValue={l.monthlyLimit} id={`monthly-${l.role}`} className="px-2 py-1 rounded-lg text-sm text-white w-20 outline-none border border-[#3a3a3a]" style={{ background: '#1a1a1a' }} />
                          </div>
                          <button onClick={() => { const d = (document.getElementById(`daily-${l.role}`) as HTMLInputElement).value; const m = (document.getElementById(`monthly-${l.role}`) as HTMLInputElement).value; handleSaveLimits(l.role, parseInt(d), parseInt(m)); }} className="px-3 py-1 rounded-lg text-xs text-[#dee2e6] border border-[#3a3a3a] hover:bg-[#2a2a2a]">Save</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Logs */}
              {tab === 'logs' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-white">System Logs</h2>
                  <div className="space-y-2">
                    {logs.length === 0 ? (
                      <p className="text-[#868e96] text-center py-10">No logs yet</p>
                    ) : logs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-[#2a2a2a] p-4" style={{ background: '#2a2a2a' }}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded font-mono ${log.level === 'error' ? 'text-[#ff6b6b]' : log.level === 'warn' ? 'text-[#fcc419]' : 'text-[#868e96]'}`} style={{ background: log.level === 'error' ? '#ff6b6b20' : log.level === 'warn' ? '#fcc41920' : '#1a1a1a' }}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-sm text-[#dee2e6]">{log.message}</span>
                        </div>
                        <p className="text-xs text-[#495057] mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
