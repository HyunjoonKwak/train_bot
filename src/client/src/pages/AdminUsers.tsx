import { useEffect, useState } from 'react';
import { Card, LoadingSpinner, EmptyState } from '../components/common';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface UserItem {
  id: number;
  kakao_id: string;
  nickname: string;
  profile_image: string | null;
  role: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuthStore();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<UserItem[]>('/users');
      setUsers(res.data ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (id: number, role: string) => {
    try {
      await api.patch(`/users/${id}/role`, { role });
      await loadUsers();
    } catch {
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      if (isActive) {
        await api.patch(`/users/${id}/deactivate`);
      } else {
        await api.patch(`/users/${id}/activate`);
      }
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>

      <Card>
        {users.length === 0 ? (
          <EmptyState title="등록된 사용자가 없습니다" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">사용자</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">역할</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">상태</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">가입일</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {u.profile_image ? (
                          <img src={u.profile_image} alt={u.nickname} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                            {u.nickname.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{u.nickname}</p>
                          <p className="text-xs text-gray-500">ID: {u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === currentUser?.id}
                        className="border rounded px-2 py-1 text-xs disabled:opacity-50"
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-500">{u.created_at?.slice(0, 10)}</td>
                    <td className="py-3 px-2">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleActive(u.id, !!u.is_active)}
                          className={`text-xs ${u.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {u.is_active ? '비활성화' : '활성화'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
