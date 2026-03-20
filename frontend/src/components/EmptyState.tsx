interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  compact?: boolean
}

const EmptyState = ({
  icon = '📭',
  title,
  description,
  compact = false,
}: EmptyStateProps) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm text-center text-gray-400 ${
        compact ? 'p-8' : 'p-12'
      }`}
    >
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  )
}

export default EmptyState
