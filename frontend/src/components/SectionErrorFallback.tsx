interface SectionErrorFallbackProps {
  title: string
  description: string
}

const SectionErrorFallback = ({ title, description }: SectionErrorFallbackProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
        <p className="text-3xl mb-2">🛠️</p>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}

export default SectionErrorFallback
