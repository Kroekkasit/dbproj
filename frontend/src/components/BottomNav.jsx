import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const BottomNav = () => {
  const location = useLocation()
  const { user } = useAuth()

  if (user?.type === 'sender') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-primary text-white px-4 py-2 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <Link
            to="/sender"
            className={`flex flex-col items-center space-y-1 px-4 py-2 ${location.pathname === '/sender' ? 'opacity-100' : 'opacity-70'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>

          <Link
            to="/sender/history"
            className={`flex flex-col items-center space-y-1 px-4 py-2 ${location.pathname === '/sender/history' ? 'opacity-100' : 'opacity-70'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Shipment</span>
          </Link>

          <Link
            to="/sender/create"
            className={`flex flex-col items-center space-y-1 px-4 py-2 ${location.pathname === '/sender/create' ? 'opacity-100' : 'opacity-70'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Create</span>
          </Link>

          <Link
            to="/sender/account"
            className={`flex flex-col items-center space-y-1 px-4 py-2 ${location.pathname === '/sender/account' ? 'opacity-100' : 'opacity-70'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Account</span>
          </Link>
        </div>
      </nav>
    )
  }

  if (user?.type === 'carrier') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-primary text-white px-4 py-2 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <Link
            to="/carrier"
            className={`flex flex-col items-center space-y-1 px-4 py-2 ${
              location.pathname === '/carrier' && !location.pathname.includes('/parcel') 
                ? 'opacity-100' 
                : 'opacity-70'
            }`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>

          <Link
            to="/carrier/notifications"
            className={`flex flex-col items-center space-y-1 px-4 py-2 ${location.pathname === '/carrier/notifications' ? 'opacity-100' : 'opacity-70'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-xs">Notifications</span>
          </Link>

          <Link
            to="/carrier/account"
            className={`flex flex-col items-center space-y-1 px-4 py-2 ${location.pathname === '/carrier/account' ? 'opacity-100' : 'opacity-70'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Account</span>
          </Link>
        </div>
      </nav>
    )
  }

  return null
}

export default BottomNav

