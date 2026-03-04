const STATUS_STYLES: Record<string, string> = {
  NEEDED: 'bg-yellow-100 text-yellow-800',
  BOOKED: 'bg-green-100 text-green-800',
  NOT_NEEDED: 'bg-gray-100 text-gray-600',
  SEARCHING: 'bg-blue-100 text-blue-800',
  RECOMMENDED: 'bg-purple-100 text-purple-800',
  SUCCESS: 'bg-green-100 text-green-800',
  FAIL: 'bg-red-100 text-red-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  NEEDED: '필요',
  BOOKED: '예매완료',
  NOT_NEEDED: '불필요',
  SEARCHING: '검색중',
  RECOMMENDED: '추천',
  SUCCESS: '성공',
  FAIL: '실패',
  RUNNING: '실행중',
  PENDING: '대기',
  CANCELLED: '취소',
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800'
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
