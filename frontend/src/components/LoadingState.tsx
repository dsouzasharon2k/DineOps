interface LoadingStateProps {
  message?: string
  fullPage?: boolean
}

const LoadingState = ({ message = 'Loading...', fullPage = false }: LoadingStateProps) => {
  return (
    <div
      className={`flex items-center justify-center text-gray-400 ${
        fullPage ? 'min-h-screen' : 'h-48'
      }`}
    >
      {message}
    </div>
  )
}

export default LoadingState
