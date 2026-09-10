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
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-scriptgpt-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400">Loading ScriptGPT...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-scriptgpt-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400">Loading ScriptGPT...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'ADMIN') return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-scriptgpt-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400">Loading ScriptGPT...</p>
        </div>
      </div>
    );
  }

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
            duration: 4000,
            style: {
              background: '#212529',
              color: '#e9ecef',
              border: '1px solid #30363d',
            },
            success: {
              iconTheme: { primary: '#4c6ef5', secondary: '#e9ecef' },
            },
            error: {
              iconTheme: { primary: '#ff6b6b', secondary: '#e9ecef' },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}
