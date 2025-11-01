import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PrivateRoute = ({ children, requiredType = null }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    // Redirect to appropriate login based on route
    if (location.pathname.startsWith('/carrier') || requiredType === 'carrier') {
      return <Navigate to="/carrier/login" replace />
    }
    return <Navigate to="/login" replace />
  }

  // Enforce type checking - redirect if wrong user type
  if (requiredType && user.type !== requiredType) {
    // Wrong user type accessing route - redirect to their own dashboard
    return <Navigate to={user.type === 'sender' ? '/sender' : '/carrier'} replace />
  }

  // If route has a prefix, ensure user type matches
  if (location.pathname.startsWith('/sender') && user.type !== 'sender') {
    return <Navigate to="/carrier" replace />
  }
  if (location.pathname.startsWith('/carrier') && user.type !== 'carrier') {
    return <Navigate to="/sender" replace />
  }

  return children
}

export default PrivateRoute

