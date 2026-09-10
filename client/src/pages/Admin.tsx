import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { DashboardStats, AdminUser, Conversation, SystemLog } from '../types';
import toast from 'react-hot-toast';
import { ArrowLeft, Users, MessageSquare, Activity, BarChart3, Settings, Shield, Terminal, Trash2, Plus, Save, FileText, Cpu, TrendingUp } from 'lucide-react';

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
        case 'dashboard': setDashboard(await api.get<DashboardStats>('/admin?sub=dashboard')); break;
        case 'users': setUsers(await api.get<AdminUser[]>('/admin?sub=users')); break;
        case 'conversations': setConversations(await api.get<Conversation[]>('/admin?sub=conversations')); break;
        case 'usage': setUsageLogs(await api.get<any[]>('/admin?sub=usage')); break;
        case 'settings': { const s = await api.get<Record<string, string>>('/admin?sub=settings'); const l = await api.get<any[]>('/admin?sub=limits'); setSettings(s); setLimits(l); break; }
        case 'logs': setLogs(await api.get<SystemLog[]>('/admin?sub=logs')); break;
      }
    } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try { await api.put(`/admin?id=${userId}&sub=role`, { role }); setUsers((p) => p.map((u) => u.id === userId ? { ...u, role } : u)); toast.success('Role updated'); } catch { toast.error('Failed'); }
  };
  const handleLimitsChange = async (userId: string, daily: number, monthly: number) => {
    try { await api.put(`/admin?id=${userId}&sub=limits`, { dailyLimit: daily, monthlyLimit: monthly }); setUsers((p) => p.map((u) => u.id === userId ? { ...u, dailyLimit: daily, monthlyLimit: monthly } : u)); toast.success('Limits updated'); } catch { toast.error('Failed'); }
  };
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure?')) return;
    try { await api.delete(`/admin?id=${userId}`); setUsers((p) => p.filter((u) => u.id !== userId)); toast.success('Deleted'); } catch { toast.error('Failed'); }
  };
  const handleCreateUser = async () => {
    try { await api.post('/admin?sub=create-user', newUser); setShowCreateUser(false); setNewUser({ email: '', username: '', password: '', role: 'USER', dailyLimit: 50, monthlyLimit: 1000 }); loadTab('users'); toast.success('Created'); } catch (e: any) { toast.error(e.message || 'Failed'); }
  };
  const handleSaveSettings = async () => {
    try { await api.put('/admin?sub=settings', settings); toast.success('Saved'); } catch { toast.error('Failed'); }
  };
  const handleSaveLimits = async (role: string, daily: number, monthly: number) => {
    try { await api.put(`/admin?sub=limits&id=${role}`, { dailyLimit: daily, monthlyLimit: monthly }); toast.success('Updated'); } catch { toast.error('Failed'); }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'usage', label: 'Usage', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logs', label: 'Logs', icon: FileText },
  ];

  const inputStyle = { border: '1px solid #e5e7eb', color: '#111827', background: '#ffffff' };
  const cardStyle = { border: '1px solid #e5e7eb' };

  return (
    <div className="min-h-screen flex" style={{ background: '#ffffff' }}>
      <aside className="w-56 flex flex-col hidden md:flex" style={{ borderRight: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-2 p-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <Shield className="w-4 h-4" style={{ color: '#10a37f' }} />
          <span className="text-sm font-medium" style={{ color: '#111827' }}>Admin Panel</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all" style={{ background: tab === t.id ? '#f0f0f0' : 'transparent', color: tab === t.id ? '#111827' : '#6b7280' }}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm" style={{ color: '#6b7280' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Chat
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex gap-1 p-2 overflow-x-auto" style={{ borderBottom: '1px solid #e5e7eb' }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap" style={{ background: tab === t.id ? '#f0f0f0' : 'transparent', color: tab === t.id ? '#111827' : '#6b7280' }}>
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid #e5e7eb', borderTopColor: '#10a37f' }} />
            </div>
          ) : (
            <>
              {tab === 'dashboard' && dashboard && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Dashboard</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Users', value: dashboard.totalUsers, icon: Users, color: '#10a37f' },
                      { label: 'Conversations', value: dashboard.totalConversations, icon: MessageSquare, color: '#3b82f6' },
                      { label: 'Total Messages', value: dashboard.totalMessages, icon: Terminal, color: '#8b5cf6' },
                      { label: "Today's Requests", value: dashboard.dailyUsage, icon: TrendingUp, color: '#f59e0b' },
                    ].map((stat, i) => (
                      <div key={i} className="rounded-xl p-4" style={cardStyle}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                          </div>
                          <div>
                            <p className="text-2xl font-bold" style={{ color: '#111827' }}>{stat.value}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{stat.label}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-xl p-5" style={cardStyle}>
                      <h3 className="font-medium mb-3" style={{ color: '#111827' }}>Recent Users</h3>
                      <div className="space-y-2">
                        {dashboard.recentUsers.map((u) => (
                          <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f7f7f8' }}>
                            <span className="text-sm" style={{ color: '#374151' }}>{u.username}</span>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: u.role === 'ADMIN' ? '#10a37f15' : '#f0f0f0', color: u.role === 'ADMIN' ? '#10a37f' : '#6b7280' }}>{u.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl p-5" style={cardStyle}>
                      <h3 className="font-medium mb-3" style={{ color: '#111827' }}>Usage by Provider</h3>
                      <div className="space-y-2">
                        {dashboard.usageByProvider.map((p) => (
                          <div key={p.aiProvider} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f7f7f8' }}>
                            <span className="text-sm" style={{ color: '#374151' }}>{p.aiProvider}</span>
                            <span className="text-sm font-mono" style={{ color: '#6b7280' }}>{p._count} requests</span>
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
                    <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Users</h2>
                    <button onClick={() => setShowCreateUser(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm" style={{ background: '#10a37f' }}>
                      <Plus className="w-4 h-4" /> Create User
                    </button>
                  </div>
                  {showCreateUser && (
                    <div className="rounded-xl p-5" style={cardStyle}>
                      <h3 className="font-medium mb-4" style={{ color: '#111827' }}>New User</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="Email" />
                        <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="Username" />
                        <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="Password" />
                        <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="USER">User</option><option value="ADMIN">Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={handleCreateUser} className="px-4 py-2 rounded-xl text-white text-sm" style={{ background: '#10a37f' }}>Create</button>
                        <button onClick={() => setShowCreateUser(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: '#374151', border: '1px solid #e5e7eb' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div key={u.id} className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={cardStyle}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm" style={{ color: '#111827' }}>{u.username}</span>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: u.role === 'ADMIN' ? '#10a37f15' : '#f0f0f0', color: u.role === 'ADMIN' ? '#10a37f' : '#6b7280' }}>{u.role}</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{u.email}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{u._count.conversations} conversations, {u._count.usageLogs} requests</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} className="px-2 py-1 rounded-lg text-xs outline-none" style={inputStyle}>
                            <option value="USER">User</option><option value="ADMIN">Admin</option>
                          </select>
                          <input type="number" value={u.dailyLimit} onChange={(e) => handleLimitsChange(u.id, parseInt(e.target.value), u.monthlyLimit)} className="px-2 py-1 rounded-lg text-xs w-16 outline-none" style={inputStyle} title="Daily" />
                          <input type="number" value={u.monthlyLimit} onChange={(e) => handleLimitsChange(u.id, u.dailyLimit, parseInt(e.target.value))} className="px-2 py-1 rounded-lg text-xs w-16 outline-none" style={inputStyle} title="Monthly" />
                          <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#9ca3af' }}>
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
                  <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Conversations</h2>
                  <div className="space-y-2">
                    {conversations.map((c) => (
                      <div key={c.id} className="rounded-xl p-4" style={cardStyle}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate" style={{ color: '#111827' }}>{c.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#f0f0f0', color: '#6b7280' }}>{c.aiProvider}</span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{c.user?.username} · {c._count?.messages || 0} messages · {new Date(c.updatedAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'usage' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Usage Logs</h2>
                  <div className="space-y-2">
                    {usageLogs.map((log) => (
                      <div key={log.id} className="rounded-xl p-4" style={cardStyle}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm" style={{ color: '#374151' }}>{log.user?.username}</span>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#f0f0f0', color: '#6b7280' }}>{log.aiProvider}</span>
                          <span className="text-xs" style={{ color: '#9ca3af' }}>{log.requestType}</span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{log.totalTokens} tokens · {new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>System Settings</h2>
                  <div className="rounded-xl p-5" style={cardStyle}>
                    <div className="flex items-center gap-2 mb-4">
                      <Cpu className="w-5 h-5" style={{ color: '#10a37f' }} />
                      <h3 className="font-medium" style={{ color: '#111827' }}>ScriptGPT AI Configuration</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>Admin Gemini API Key</label>
                        <input type="password" value={settings.ADMIN_GEMINI_KEY || ''} onChange={(e) => setSettings({ ...settings, ADMIN_GEMINI_KEY: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} placeholder="Enter admin Gemini API key..." />
                        <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Used for ScriptGPT AI mode</p>
                      </div>
                      <button onClick={handleSaveSettings} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm" style={{ background: '#10a37f' }}>
                        <Save className="w-4 h-4" /> Save Settings
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl p-5" style={cardStyle}>
                    <h3 className="font-medium mb-4" style={{ color: '#111827' }}>Default Usage Limits</h3>
                    <div className="space-y-3">
                      {limits.map((l) => (
                        <div key={l.role} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: '#f7f7f8' }}>
                          <span className="font-medium w-20 text-sm" style={{ color: '#374151' }}>{l.role}</span>
                          <div className="flex items-center gap-2">
                            <label className="text-xs" style={{ color: '#6b7280' }}>Daily:</label>
                            <input type="number" defaultValue={l.dailyLimit} id={`daily-${l.role}`} className="px-2 py-1 rounded-lg text-sm w-20 outline-none" style={inputStyle} />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs" style={{ color: '#6b7280' }}>Monthly:</label>
                            <input type="number" defaultValue={l.monthlyLimit} id={`monthly-${l.role}`} className="px-2 py-1 rounded-lg text-sm w-20 outline-none" style={inputStyle} />
                          </div>
                          <button onClick={() => { const d = (document.getElementById(`daily-${l.role}`) as HTMLInputElement).value; const m = (document.getElementById(`monthly-${l.role}`) as HTMLInputElement).value; handleSaveLimits(l.role, parseInt(d), parseInt(m)); }} className="px-3 py-1 rounded-lg text-xs" style={{ border: '1px solid #e5e7eb', color: '#374151' }}>Save</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'logs' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>System Logs</h2>
                  <div className="space-y-2">
                    {logs.length === 0 ? <p className="text-center py-10" style={{ color: '#6b7280' }}>No logs yet</p> : logs.map((log) => (
                      <div key={log.id} className="rounded-xl p-4" style={cardStyle}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: log.level === 'error' ? '#fef2f2' : log.level === 'warn' ? '#fefce8' : '#f0f0f0', color: log.level === 'error' ? '#dc2626' : log.level === 'warn' ? '#ca8a04' : '#6b7280' }}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-sm" style={{ color: '#374151' }}>{log.message}</span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>{new Date(log.createdAt).toLocaleString()}</p>
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
