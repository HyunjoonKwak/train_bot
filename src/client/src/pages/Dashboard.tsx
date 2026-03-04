import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, LoadingSpinner, StatusBadge } from '../components/common';
import { api } from '../api/client';
import type { Run, WeekPlan } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<{ total: number; success: number; fail: number; successRate: number } | null>(null);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [upcomingPlans, setUpcomingPlans] = useState<WeekPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, runsRes, plansRes] = await Promise.all([
          api.get<{ total: number; success: number; fail: number; successRate: number }>('/runs/stats'),
          api.get<Run[]>('/runs/recent?limit=5'),
          api.get<WeekPlan[]>('/week-plans/upcoming'),
        ]);
        setStats(statsRes.data ?? null);
        setRecentRuns(runsRes.data ?? []);
        setUpcomingPlans(plansRes.data ?? []);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.message !== 'Unauthorized') {
          setError('데이터를 불러올 수 없습니다.');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="오늘 실행" value={stats?.total ?? 0} />
        <StatCard label="성공" value={stats?.success ?? 0} color="text-green-600" />
        <StatCard label="실패" value={stats?.fail ?? 0} color="text-red-600" />
        <StatCard label="성공률" value={`${stats?.successRate ?? 0}%`} color="text-primary-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Runs */}
        <Card title="최근 실행" action={<Link to="/results" className="text-sm text-primary-600 hover:text-primary-800">전체보기</Link>}>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-gray-500">실행 기록이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-sm font-medium">{run.departureStation} → {run.arrivalStation}</span>
                    <p className="text-xs text-gray-500">{run.departureDate} | {run.trainType ?? 'ALL'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{run.resultCount}건</span>
                    <StatusBadge status={run.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Plans */}
        <Card title="다가오는 일정" action={<Link to="/calendar" className="text-sm text-primary-600 hover:text-primary-800">전체보기</Link>}>
          {upcomingPlans.length === 0 ? (
            <p className="text-sm text-gray-500">예정된 일정이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {upcomingPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-sm font-medium">{plan.planDate}</span>
                    <p className="text-xs text-gray-500">
                      {plan.direction === 'TO_WORK' ? '출근' : '퇴근'}
                      {plan.preferredTime ? ` | ${plan.preferredTime}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={plan.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-gray-900' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
