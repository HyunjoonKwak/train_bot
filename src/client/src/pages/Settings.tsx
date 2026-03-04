import { useEffect, useState } from 'react';
import { Card, LoadingSpinner, ErrorMessage } from '../components/common';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { ConfigItem } from '../types';

const CONFIG_LABELS: Record<string, string> = {
  departure_station: '출발역',
  arrival_station: '도착역',
  preferred_train_type: '선호 열차',
  max_results: '최대 결과 수',
  auto_reserve: '자동 예매',
  telegram_enabled: '텔레그램 알림',
  search_interval_minutes: '검색 간격(분)',
};

export default function Settings() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get<ConfigItem[]>('/config');
      setConfigs(res.data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfigs(); }, []);

  const handleEdit = (key: string, value: string) => {
    setEditingKey(key);
    setEditValue(value);
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      await api.put(`/config/${key}`, { value: editValue });
      setEditingKey(null);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorMessage message={error} onRetry={loadConfigs} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">설정</h1>

      <Card title="시스템 설정">
        <div className="divide-y divide-gray-100">
          {configs.map(config => (
            <div key={config.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {CONFIG_LABELS[config.key] ?? config.key}
                </p>
                {config.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {editingKey === config.key ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="border rounded-lg px-3 py-1.5 text-sm w-40"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSave(config.key)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 border text-sm rounded-lg hover:bg-gray-50"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">{config.value}</span>
                    {isAdmin && (
                      <button
                        onClick={() => handleEdit(config.key, config.value)}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        수정
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
