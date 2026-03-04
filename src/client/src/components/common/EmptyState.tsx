interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
