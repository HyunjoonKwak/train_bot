import { useEffect, useState } from 'react';
import { Card, LoadingSpinner, EmptyState } from '../components/common';
import { api } from '../api/client';
import type { AuditLog, PaginatedResponse } from '../types';

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: '로그인',
  USER_LOGOUT: '로그아웃',
  USER_REGISTER: '회원가입',
  USER_ROLE_CHANGE: '역할 변경',
  USER_DEACTIVATE: '비활성화',
  USER_ACTIVATE: '활성화',
  CONFIG_UPDATE: '설정 변경',
  RUN_EXECUTE: '실행',
  WEEK_PLAN_UPDATE: '주간계획 수정',
  WEEK_PLAN_BULK_UPDATE: '주간계획 일괄수정',
  SCHEDULE_CREATE: '스케줄 생성',
  SCHEDULE_UPDATE: '스케줄 수정',
  SCHEDULE_DELETE: '스케줄 삭제',
};

export default function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const loadLogs = async (p: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (actionFilter) params.set('action', actionFilter);
      const res = await api.get<AuditLog[]>(`/audit-logs?${params}`) as PaginatedResponse<AuditLog>;
      setLogs(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
      setPage(p);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message !== 'Unauthorized') {
        setError('로그를 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [actionFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">전체 액션</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      <Card>
        {loading ? <LoadingSpinner /> : logs.length === 0 ? (
          <EmptyState title="로그가 없습니다" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">시간</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">액션</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">대상</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">상세</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2 text-xs text-gray-500 whitespace-nowrap">{log.createdAt?.slice(0, 16)}</td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs">
                        {log.entityType && <span className="text-gray-600">{log.entityType}#{log.entityId}</span>}
                      </td>
                      <td className="py-3 px-2 text-xs text-gray-600 max-w-xs truncate">{log.detail ?? '-'}</td>
                      <td className="py-3 px-2 text-xs text-gray-400">{log.ipAddress ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => loadLogs(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">{page} / {totalPages}</span>
                <button
                  onClick={() => loadLogs(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
