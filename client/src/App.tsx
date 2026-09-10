import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}><div className="flex flex-col items-center gap-4"><div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid #e5e7eb', borderTopColor: '#10a37f' }} /><p className="text-sm" style={{ color: '#6b7280' }}>Loading ScriptGPT...</p></div></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}><div className="flex flex-col items-center gap-4"><div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid #e5e7eb', borderTopColor: '#10a37f' }} /><p className="text-sm" style={{ color: '#6b7280' }}>Loading ScriptGPT...</p></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'ADMIN') return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}><div className="flex flex-col items-center gap-4"><div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid #e5e7eb', borderTopColor: '#10a37f' }} /><p className="text-sm" style={{ color: '#6b7280' }}>Loading ScriptGPT...</p></div></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/chat/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/admin/*" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            success: { iconTheme: { primary: '#10a37f', secondary: '#ffffff' } },
            error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } },
          }}
        />
      </Router>
    </AuthProvider>
  );
}
