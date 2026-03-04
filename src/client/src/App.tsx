import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout';
import { useAuthStore } from './stores/authStore';
import LoadingSpinner from './components/common/LoadingSpinner';
import { Dashboard, Calendar, Results, Settings, Schedules, Logs, Safety, AdminUsers } from './pages';

export default function App() {
  const { isLoading, user, fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">TrainBot</h1>
          <p className="text-gray-600 mb-6">열차 예매 어시스턴트</p>
          <a
            href="/auth/kakao"
            className="inline-flex items-center px-6 py-3 bg-yellow-400 text-black font-medium rounded-lg hover:bg-yellow-500 transition-colors"
          >
            카카오 로그인
          </a>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/results" element={<Results />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
