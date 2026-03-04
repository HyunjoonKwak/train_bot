import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const NAV_ITEMS = [
  { path: '/', label: '대시보드' },
  { path: '/calendar', label: '캘린더' },
  { path: '/results', label: '조회결과' },
  { path: '/schedules', label: '스케줄' },
  { path: '/settings', label: '설정' },
  { path: '/logs', label: '로그' },
];

export default function Header() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary-600">
              TrainBot
            </Link>
            <nav className="hidden md:ml-8 md:flex md:space-x-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              {user.profileImage && (
                <img
                  src={user.profileImage}
                  alt={user.nickname}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-700">{user.nickname}</span>
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin/users"
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  관리
                </Link>
              )}
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
