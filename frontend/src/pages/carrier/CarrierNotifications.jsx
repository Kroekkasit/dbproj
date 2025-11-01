import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const CarrierNotifications = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await notificationsAPI.getCarrierNotifications()
      setNotifications(response.data.notifications)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationID) => {
    try {
      await notificationsAPI.markAsRead(notificationID)
      setNotifications(notifications.map(n =>
        n.NotificationID === notificationID ? { ...n, IsRead: true } : n
      ))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now'
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/carrier')}
            className="mr-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">Notification</h1>
        </div>
      </div>

      {/* Content */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96">
          <svg className="w-24 h-24 text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <div className="text-primary font-semibold text-lg mb-2">You're all caught up</div>
          <div className="text-gray-500 text-sm">All notification will be displayed here</div>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {notifications.map((notification) => (
            <div
              key={notification.NotificationID}
              onClick={() => {
                if (!notification.IsRead) {
                  handleMarkAsRead(notification.NotificationID)
                }
                if (notification.ParcelID) {
                  navigate(`/carrier/parcel/${notification.ParcelID}`)
                }
              }}
              className={`px-4 py-4 cursor-pointer ${
                !notification.IsRead ? 'bg-blue-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{notification.Message}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatTime(notification.CreatedAt)}
                  </div>
                </div>
                {!notification.IsRead && (
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default CarrierNotifications

