import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { parcelsAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const SenderHome = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [parcels, setParcels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadParcels()
  }, [])

  const loadParcels = async () => {
    try {
      const response = await parcelsAPI.getSenderParcels()
      setParcels(response.data.parcels)
    } catch (error) {
      console.error('Failed to load parcels:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentShipments = parcels.filter(p => 
    ['Pending', 'Available', 'In Transit'].includes(p.Status)
  )

  const recentShipments = parcels.filter(p => 
    ['Delivered', 'Cancelled'].includes(p.Status)
  ).slice(0, 3)

  const getStatusText = (status) => {
    switch(status) {
      case 'Pending': return 'Pending'
      case 'Available': return 'Available for pickup'
      case 'In Transit': return 'On the way'
      case 'Delivered': return 'Delivered'
      default: return status
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold">
                {user?.firstname?.[0]}{user?.lastname?.[0]}
              </span>
            </div>
            <div>
              <div className="font-semibold">{user?.firstname} {user?.lastname}</div>
              <div className="text-sm opacity-90">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/sender/notifications')}
            className="relative"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tracking Section */}
      <div className="bg-primary text-white px-4 py-6">
        <h2 className="text-xl font-semibold mb-4">Let's Track Your Package</h2>
        <button
          onClick={() => navigate('/track')}
          className="w-full bg-white text-primary py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Track Parcel
        </button>
      </div>

      {/* Quick Actions */}
      <div className="bg-white px-4 py-4">
        <div className="flex space-x-4 justify-around">
          <button
            onClick={() => navigate('/sender/create')}
            className="flex flex-col items-center space-y-2"
          >
            <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 font-medium">Create</span>
          </button>

          <button
            onClick={() => navigate('/track')}
            className="flex flex-col items-center space-y-2"
          >
            <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 font-medium">Track</span>
          </button>

          <button
            onClick={() => navigate('/sender/history')}
            className="flex flex-col items-center space-y-2"
          >
            <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 font-medium">History</span>
          </button>

          <button
            onClick={() => navigate('/sender/account')}
            className="flex flex-col items-center space-y-2"
          >
            <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs text-gray-700 font-medium">Account</span>
          </button>
        </div>
      </div>

      {/* Current Shipment */}
      <div className="bg-white mt-4 px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Current Shipment</h3>
          {currentShipments.length > 0 && (
            <button
              onClick={() => navigate('/sender/history')}
              className="text-primary text-sm font-medium"
            >
              View All
            </button>
          )}
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : currentShipments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No current shipments</div>
        ) : (
          <div className="space-y-3">
            {currentShipments.slice(0, 1).map((parcel) => (
              <div
                key={parcel.ParcelID}
                onClick={() => navigate(`/sender/parcel/${parcel.ParcelID}`)}
                className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50 cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">#{parcel.TrackingNumber}</div>
                    <div className="text-sm text-gray-600">{getStatusText(parcel.Status)}. {formatDate(parcel.CreatedAt)}</div>
                    {parcel.Price ? (
                      <div className="text-sm font-semibold text-primary mt-1">
                        Total: ฿{(
                          parseFloat(parcel.Price || 0) + 
                          parseFloat(parcel.PackagePrice || 0) + 
                          parseFloat(parcel.ServiceFee || 0)
                        ).toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-sm text-yellow-600 italic mt-1">
                        Price: Calculating...
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div className="w-2 h-2 bg-primary border-2 border-white rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      </div>
                      <div className="text-xs text-gray-600">
                        From {parcel.orgDistrict || 'N/A'}, To {parcel.destDistrict || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Shipment */}
      <div className="bg-white mt-4 px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Recent Shipment</h3>
          {recentShipments.length > 0 && (
            <button
              onClick={() => navigate('/sender/history')}
              className="text-primary text-sm font-medium"
            >
              View All
            </button>
          )}
        </div>
        {recentShipments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No recent shipments</div>
        ) : (
          <div className="space-y-3">
            {recentShipments.map((parcel) => (
              <div
                key={parcel.ParcelID}
                onClick={() => navigate(`/sender/parcel/${parcel.ParcelID}`)}
                className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">#{parcel.TrackingNumber}</div>
                    <div className="text-sm text-gray-600">{getStatusText(parcel.Status)}. {formatDate(parcel.CreatedAt)}</div>
                    {parcel.Price ? (
                      <div className="text-sm font-semibold text-primary mt-1">
                        Total: ฿{(
                          parseFloat(parcel.Price || 0) + 
                          parseFloat(parcel.PackagePrice || 0) + 
                          parseFloat(parcel.ServiceFee || 0)
                        ).toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 mt-1">
                        {(parcel.PackagePrice > 0 || parcel.ServiceFee > 0) && (
                          <span className="text-xs">
                            Upfront: ฿{(parseFloat(parcel.PackagePrice || 0) + parseFloat(parcel.ServiceFee || 0)).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default SenderHome

