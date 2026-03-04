import { useEffect, useState } from 'react';
import { Card, LoadingSpinner, EmptyState } from '../components/common';
import { api } from '../api/client';
import type { Schedule, TaskType } from '../types';
import { useAuthStore } from '../stores/authStore';

const TASK_TYPE_LABELS: Record<string, string> = {
  SEARCH: '열차 검색',
  CLEANUP: '데이터 정리',
  HEALTH_CHECK: '상태 확인',
};

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [form, setForm] = useState({
    name: '',
    cronExpression: '*/5 * * * *',
    taskType: 'SEARCH' as TaskType,
  });

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get<Schedule[]>('/schedules');
      setSchedules(res.data ?? []);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message !== 'Unauthorized') {
        setError('스케줄을 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSchedules(); }, []);

  const handleCreate = async () => {
    try {
      await api.post('/schedules', form);
      setShowForm(false);
      setForm({ name: '', cronExpression: '*/5 * * * *', taskType: 'SEARCH' });
      await loadSchedules();
    } catch (err) {
      if (err instanceof Error && err.message !== 'Unauthorized') {
        setError(err.message);
      }
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await api.put(`/schedules/${id}`, { isActive: !isActive });
      await loadSchedules();
    } catch (err) {
      if (err instanceof Error && err.message !== 'Unauthorized') {
        setError(err.message);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 스케줄을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      await loadSchedules();
    } catch (err) {
      if (err instanceof Error && err.message !== 'Unauthorized') {
        setError(err.message);
      }
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">스케줄 관리</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
          >
            {showForm ? '취소' : '+ 새 스케줄'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      {showForm && (
        <Card title="새 스케줄 생성">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">이름</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="스케줄 이름"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cron 표현식</label>
              <input
                type="text"
                value={form.cronExpression}
                onChange={e => setForm(f => ({ ...f, cronExpression: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">작업 유형</label>
              <select
                value={form.taskType}
                onChange={e => setForm(f => ({ ...f, taskType: e.target.value as TaskType }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="SEARCH">열차 검색</option>
                <option value="CLEANUP">데이터 정리</option>
                <option value="HEALTH_CHECK">상태 확인</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!form.name}
            className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            생성
          </button>
        </Card>
      )}

      <Card>
        {schedules.length === 0 ? (
          <EmptyState title="등록된 스케줄이 없습니다" description="새 스케줄을 생성해보세요" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">이름</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">유형</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cron</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">상태</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">마지막 실행</th>
                  {isAdmin && <th className="text-left py-3 px-2 font-medium text-gray-600">관리</th>}
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{s.name}</td>
                    <td className="py-3 px-2">{TASK_TYPE_LABELS[s.taskType] ?? s.taskType}</td>
                    <td className="py-3 px-2 font-mono text-xs">{s.cronExpression}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {s.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-500">{s.lastRunAt ?? '-'}</td>
                    {isAdmin && (
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggle(s.id, s.isActive)}
                            className="text-xs text-primary-600 hover:text-primary-800"
                          >
                            {s.isActive ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    )}
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
