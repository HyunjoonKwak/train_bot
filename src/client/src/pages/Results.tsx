import { useEffect, useState } from 'react';
import { Card, LoadingSpinner, StatusBadge, EmptyState } from '../components/common';
import { api } from '../api/client';
import type { Run, TrainResult, Recommendation, PaginatedResponse } from '../types';

function kstDateString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

const MAX_PAGE_BUTTONS = 10;

export default function Results() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchForm, setSearchForm] = useState({
    departureDate: kstDateString(),
    departureTimeFrom: '06:00',
    departureTimeTo: '22:00',
    trainType: 'SRT' as 'SRT' | 'KTX' | 'ALL',
  });
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TrainResult[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const limit = 10;

  const loadRuns = async (p: number = 1) => {
    setLoading(true);
    try {
      const res = await api.get<Run[]>(`/runs?page=${p}&limit=${limit}`) as PaginatedResponse<Run>;
      setRuns(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
      setPage(p);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message !== 'Unauthorized') {
        setError('실행 기록을 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRuns(); }, []);

  const handleSearch = async () => {
    setSearching(true);
    setSearchResults([]);
    setRecommendations([]);
    try {
      const res = await api.post<{ runId: number; results: TrainResult[]; recommendations: Recommendation[] }>('/runs', searchForm);
      if (res.data) {
        setSearchResults(res.data.results ?? []);
        setRecommendations(res.data.recommendations ?? []);
      }
      await loadRuns(1);
    } catch (err) {
      if (err instanceof Error && err.message !== 'Unauthorized') {
        setError(err.message);
      }
    } finally {
      setSearching(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">조회결과</h1>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      {/* Search Form */}
      <Card title="열차 조회">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">출발일</label>
            <input
              type="date"
              value={searchForm.departureDate}
              onChange={e => setSearchForm(s => ({ ...s, departureDate: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">출발시간 (부터)</label>
            <input
              type="time"
              value={searchForm.departureTimeFrom}
              onChange={e => setSearchForm(s => ({ ...s, departureTimeFrom: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">출발시간 (까지)</label>
            <input
              type="time"
              value={searchForm.departureTimeTo}
              onChange={e => setSearchForm(s => ({ ...s, departureTimeTo: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">열차종류</label>
            <select
              value={searchForm.trainType}
              onChange={e => setSearchForm(s => ({ ...s, trainType: e.target.value as 'SRT' | 'KTX' | 'ALL' }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="SRT">SRT</option>
              <option value="KTX">KTX</option>
              <option value="ALL">전체</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
            >
              {searching ? '검색 중...' : '조회하기'}
            </button>
          </div>
        </div>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card title={`조회 결과 (${searchResults.length}건)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">열차</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">출발</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">도착</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">소요시간</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">가격</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">좌석</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">추천</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((train, idx) => {
                  const rec = recommendations.find(r => r.train.trainNumber === train.trainNumber && r.train.departureTime === train.departureTime);
                  return (
                    <tr key={idx} className={`border-b border-gray-50 hover:bg-gray-50 ${rec ? 'bg-purple-50' : ''}`}>
                      <td className="py-3 px-2">
                        <span className="font-medium">{train.trainType}</span>
                        <span className="text-gray-500 ml-1">{train.trainNumber}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium">{train.departureTime}</div>
                        <div className="text-xs text-gray-500">{train.departureStation}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium">{train.arrivalTime}</div>
                        <div className="text-xs text-gray-500">{train.arrivalStation}</div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{train.duration}</td>
                      <td className="py-3 px-2">{train.price > 0 ? `${train.price.toLocaleString()}원` : '-'}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${train.seatAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {train.seatAvailable ? '있음' : '매진'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {rec && (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              {rec.score}점
                            </span>
                            <div className="text-xs text-gray-500 mt-0.5">{rec.reason}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Results List */}
      <Card title="실행 기록">
        {loading ? <LoadingSpinner /> : runs.length === 0 ? (
          <EmptyState title="실행 기록이 없습니다" description="위에서 열차를 조회해보세요" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">ID</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">유형</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">구간</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">출발일</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">결과</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">상태</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">실행시간</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(run => (
                    <tr key={run.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-500">#{run.id}</td>
                      <td className="py-3 px-2">{run.type}</td>
                      <td className="py-3 px-2">{run.departureStation} → {run.arrivalStation}</td>
                      <td className="py-3 px-2">{run.departureDate}</td>
                      <td className="py-3 px-2">{run.resultCount}건</td>
                      <td className="py-3 px-2"><StatusBadge status={run.status} /></td>
                      <td className="py-3 px-2 text-xs text-gray-500">{run.createdAt?.slice(0, 16)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => loadRuns(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  이전
                </button>
                {Array.from({ length: Math.min(totalPages, MAX_PAGE_BUTTONS) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - Math.floor(MAX_PAGE_BUTTONS / 2), totalPages - MAX_PAGE_BUTTONS + 1));
                  return start + i;
                }).map(p => (
                  <button
                    key={p}
                    onClick={() => loadRuns(p)}
                    className={`px-3 py-1 text-sm rounded ${p === page ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => loadRuns(page + 1)}
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
