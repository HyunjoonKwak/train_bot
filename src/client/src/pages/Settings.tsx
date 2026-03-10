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

const TRAIN_CREDENTIAL_KEYS = new Set([
  'srt_login_type', 'srt_login_id', 'srt_password',
  'korail_login_type', 'korail_login_id', 'korail_password',
]);

type LoginType = 'phone' | 'member';

interface CredentialStatus {
  srt: { configured: boolean; loginType: LoginType; loginId: string };
  korail: { configured: boolean; loginType: LoginType; loginId: string };
}

interface CredentialForm {
  loginType: LoginType;
  loginId: string;
  password: string;
}

export default function Settings() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Train credentials state
  const [credStatus, setCredStatus] = useState<CredentialStatus | null>(null);
  const [srtForm, setSrtForm] = useState<CredentialForm>({ loginType: 'phone', loginId: '', password: '' });
  const [korailForm, setKorailForm] = useState<CredentialForm>({ loginType: 'phone', loginId: '', password: '' });
  const [trainSaving, setTrainSaving] = useState<string | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [trainSuccess, setTrainSuccess] = useState<string | null>(null);

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

  const loadCredentials = async () => {
    try {
      const res = await api.get<CredentialStatus>('/train/credentials');
      setCredStatus(res.data ?? null);
    } catch {
      // ignore — not critical
    }
  };

  useEffect(() => {
    loadConfigs();
    if (isAdmin) loadCredentials();
  }, []);

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

  const handleTrainConnect = async (provider: 'srt' | 'korail') => {
    const form = provider === 'srt' ? srtForm : korailForm;
    if (!form.loginId || !form.password) {
      setTrainError('로그인 ID와 비밀번호를 입력해주세요.');
      return;
    }

    setTrainSaving(provider);
    setTrainError(null);
    setTrainSuccess(null);

    try {
      const res = await api.post<null>('/train/credentials', {
        provider,
        loginType: form.loginType,
        loginId: form.loginId,
        password: form.password,
      });
      if (res.success) {
        setTrainSuccess(res.message ?? `${provider.toUpperCase()} 연결 성공`);
        if (provider === 'srt') setSrtForm({ loginType: 'phone', loginId: '', password: '' });
        else setKorailForm({ loginType: 'phone', loginId: '', password: '' });
        await loadCredentials();
      } else {
        setTrainError((res as any).error ?? '연결에 실패했습니다.');
      }
    } catch (err) {
      setTrainError(err instanceof Error ? err.message : '연결 테스트에 실패했습니다.');
    } finally {
      setTrainSaving(null);
    }
  };

  const handleTrainDisconnect = async (provider: 'srt' | 'korail') => {
    setTrainSaving(provider);
    setTrainError(null);
    setTrainSuccess(null);
    try {
      await api.delete(`/train/credentials/${provider}`);
      setTrainSuccess(`${provider.toUpperCase()} 연결이 해제되었습니다.`);
      await loadCredentials();
    } catch (err) {
      setTrainError(err instanceof Error ? err.message : '연결 해제에 실패했습니다.');
    } finally {
      setTrainSaving(null);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorMessage message={error} onRetry={loadConfigs} />;

  const filteredConfigs = configs.filter(c => !TRAIN_CREDENTIAL_KEYS.has(c.key));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">설정</h1>

      {/* Train API Credentials */}
      {isAdmin && (
        <Card title="열차 API 연동">
          {trainError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {trainError}
            </div>
          )}
          {trainSuccess && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {trainSuccess}
            </div>
          )}

          <div className="space-y-6">
            {/* SRT */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">SRT</h3>
                {credStatus?.srt.configured ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    연결됨 ({credStatus.srt.loginType === 'member' ? '회원번호' : '전화번호'}: {credStatus.srt.loginId})
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    미설정
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2">
                <div className="w-28">
                  <label className="block text-xs text-gray-500 mb-1">로그인 방식</label>
                  <select
                    value={srtForm.loginType}
                    onChange={e => setSrtForm(f => ({ ...f, loginType: e.target.value as LoginType }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="phone">전화번호</option>
                    <option value="member">회원번호</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    {srtForm.loginType === 'member' ? '회원번호' : '전화번호'}
                  </label>
                  <input
                    type="text"
                    placeholder={srtForm.loginType === 'member' ? '회원번호' : '010-0000-0000'}
                    value={srtForm.loginId}
                    onChange={e => setSrtForm(f => ({ ...f, loginId: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">비밀번호</label>
                  <input
                    type="password"
                    placeholder="비밀번호"
                    value={srtForm.password}
                    onChange={e => setSrtForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => handleTrainConnect('srt')}
                  disabled={trainSaving === 'srt'}
                  className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {trainSaving === 'srt' ? '테스트 중...' : '연결 테스트 & 저장'}
                </button>
                {credStatus?.srt.configured && (
                  <button
                    onClick={() => handleTrainDisconnect('srt')}
                    disabled={trainSaving === 'srt'}
                    className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
                  >
                    연결 해제
                  </button>
                )}
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Korail */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Korail (KTX)</h3>
                {credStatus?.korail.configured ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    연결됨 ({credStatus.korail.loginType === 'member' ? '회원번호' : '전화번호'}: {credStatus.korail.loginId})
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    미설정
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2">
                <div className="w-28">
                  <label className="block text-xs text-gray-500 mb-1">로그인 방식</label>
                  <select
                    value={korailForm.loginType}
                    onChange={e => setKorailForm(f => ({ ...f, loginType: e.target.value as LoginType }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="phone">전화번호</option>
                    <option value="member">회원번호</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    {korailForm.loginType === 'member' ? '회원번호' : '전화번호'}
                  </label>
                  <input
                    type="text"
                    placeholder={korailForm.loginType === 'member' ? '회원번호' : '010-0000-0000'}
                    value={korailForm.loginId}
                    onChange={e => setKorailForm(f => ({ ...f, loginId: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">비밀번호</label>
                  <input
                    type="password"
                    placeholder="비밀번호"
                    value={korailForm.password}
                    onChange={e => setKorailForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => handleTrainConnect('korail')}
                  disabled={trainSaving === 'korail'}
                  className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {trainSaving === 'korail' ? '테스트 중...' : '연결 테스트 & 저장'}
                </button>
                {credStatus?.korail.configured && (
                  <button
                    onClick={() => handleTrainDisconnect('korail')}
                    disabled={trainSaving === 'korail'}
                    className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
                  >
                    연결 해제
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card title="시스템 설정">
        <div className="divide-y divide-gray-100">
          {filteredConfigs.map(config => (
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
