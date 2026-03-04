import { useEffect, useState, useMemo } from 'react';
import { Card, LoadingSpinner, StatusBadge, EmptyState } from '../components/common';
import { api } from '../api/client';
import type { WeekPlan, PlanDirection, PlanStatus } from '../types';

const DIRECTION_LABELS: Record<PlanDirection, string> = {
  TO_WORK: '출근',
  TO_HOME: '퇴근',
};

const STATUS_OPTIONS: { value: PlanStatus; label: string }[] = [
  { value: 'NEEDED', label: '필요' },
  { value: 'NOT_NEEDED', label: '불필요' },
  { value: 'BOOKED', label: '예매완료' },
  { value: 'SEARCHING', label: '검색중' },
];

function kstDateString(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

export default function Calendar() {
  const [plans, setPlans] = useState<WeekPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate, weekDates } = useMemo(() => {
    const now = new Date();
    const todayKst = kstDateString(now);
    const [y, m, day] = todayKst.split('-').map(Number);
    const base = new Date(y, m - 1, day);
    const dayOfWeek = base.getDay();
    const monday = new Date(base);
    monday.setDate(base.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(kstDateString(d));
    }

    return {
      startDate: dates[0],
      endDate: dates[6],
      weekDates: dates,
    };
  }, [weekOffset]);

  useEffect(() => {
    setLoading(true);
    api.get<WeekPlan[]>(`/week-plans?startDate=${startDate}&endDate=${endDate}`)
      .then(res => { setPlans(res.data ?? []); setError(null); })
      .catch((err) => {
        if (err instanceof Error && err.message !== 'Unauthorized') {
          setError('일정을 불러올 수 없습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const handleStatusChange = async (date: string, direction: PlanDirection, status: PlanStatus, preferredTime?: string) => {
    try {
      await api.put(`/week-plans/${date}/${direction}`, { status, preferredTime });
      const res = await api.get<WeekPlan[]>(`/week-plans?startDate=${startDate}&endDate=${endDate}`);
      setPlans(res.data ?? []);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message !== 'Unauthorized') {
        setError('상태 변경에 실패했습니다.');
      }
    }
  };

  const getPlan = (date: string, direction: PlanDirection) =>
    plans.find(p => p.planDate === date && p.direction === direction);

  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">주간 캘린더</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">← 이전주</button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">이번주</button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">다음주 →</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDates.map((date, idx) => {
            const toWork = getPlan(date, 'TO_WORK');
            const toHome = getPlan(date, 'TO_HOME');
            const isWeekend = idx >= 5;

            return (
              <div key={date} className={`bg-white rounded-xl shadow-sm border p-4 ${isWeekend ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}>
                <div className="text-center mb-3">
                  <p className={`text-xs font-medium ${isWeekend ? 'text-gray-400' : 'text-gray-500'}`}>{dayNames[idx]}</p>
                  <p className="text-lg font-bold">{date.slice(8)}</p>
                </div>

                {!isWeekend && (
                  <div className="space-y-2">
                    {(['TO_WORK', 'TO_HOME'] as PlanDirection[]).map(dir => {
                      const plan = dir === 'TO_WORK' ? toWork : toHome;
                      return (
                        <div key={dir} className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                          <p className="text-xs font-medium text-gray-600 mb-1">{DIRECTION_LABELS[dir]}</p>
                          <select
                            value={plan?.status ?? 'NEEDED'}
                            onChange={(e) => handleStatusChange(date, dir, e.target.value as PlanStatus)}
                            className="w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {plan?.status === 'RECOMMENDED' && plan.recommendation && (
                            <p className="text-xs text-purple-600 mt-1">추천 있음</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
