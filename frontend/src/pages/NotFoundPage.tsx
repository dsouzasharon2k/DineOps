import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-5xl mb-2">404</p>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Page not found</h1>
        <p className="text-sm text-gray-500 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Go to Login
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
