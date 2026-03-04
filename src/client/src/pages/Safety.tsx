import { useState } from 'react';
import { Card } from '../components/common';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export default function Safety() {
  const { user } = useAuthStore();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleHealthCheck = async () => {
    try {
      const res = await api.get<{ status: string; timestamp: string }>('/health');
      setTestResult(`상태: ${res.data?.status} | 시간: ${res.data?.timestamp}`);
    } catch (err) {
      setTestResult(`오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  const handleTelegramTest = async () => {
    setTesting(true);
    try {
      // Use a manual run to test the system end-to-end
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

      await api.post('/runs', {
        departureDate: dateStr,
        trainType: 'SRT',
      });
      setTestResult('테스트 실행이 완료되었습니다. 결과 페이지를 확인하세요.');
    } catch (err) {
      setTestResult(`오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">안전장치</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="시스템 상태 확인">
          <p className="text-sm text-gray-600 mb-4">
            서버 헬스체크 API를 호출하여 시스템 상태를 확인합니다.
          </p>
          <button
            onClick={handleHealthCheck}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            상태 확인
          </button>
        </Card>

        <Card title="테스트 실행">
          <p className="text-sm text-gray-600 mb-4">
            테스트 열차 조회를 실행하여 전체 파이프라인이 정상 동작하는지 확인합니다.
          </p>
          <button
            onClick={handleTelegramTest}
            disabled={testing}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? '실행 중...' : '테스트 실행'}
          </button>
        </Card>

        <Card title="시스템 정보">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">버전</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">환경</span>
              <span className="font-medium">{import.meta.env.MODE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">로그인 사용자</span>
              <span className="font-medium">{user?.nickname ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">역할</span>
              <span className="font-medium">{user?.role ?? '-'}</span>
            </div>
          </div>
        </Card>

        <Card title="주의사항">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">&#9888;</span>
              <span>최대 4명의 사용자만 활성화할 수 있습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">&#9888;</span>
              <span>자동 예매 기능은 현재 비활성화 상태입니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">&#9888;</span>
              <span>스케줄 작업은 서버가 실행 중일 때만 동작합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">&#9888;</span>
              <span>감사 로그는 90일 후 자동 삭제됩니다.</span>
            </li>
          </ul>
        </Card>
      </div>

      {testResult && (
        <Card title="결과">
          <p className="text-sm font-mono bg-gray-50 p-3 rounded-lg">{testResult}</p>
        </Card>
      )}
    </div>
  );
}
