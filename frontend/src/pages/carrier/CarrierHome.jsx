import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { carriersAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const CarrierHome = () => {
  const navigate = useNavigate()
  const [availableParcels, setAvailableParcels] = useState([])
  const [myParcels, setMyParcels] = useState([])
  const [activeTab, setActiveTab] = useState('available')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [availableRes, myParcelsRes] = await Promise.all([
        carriersAPI.getAvailableParcels(),
        carriersAPI.getMyParcels()
      ])
      setAvailableParcels(availableRes.data.parcels)
      setMyParcels(myParcelsRes.data.parcels)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (parcelID) => {
    if (!window.confirm('Accept this parcel assignment?')) return

    try {
      await carriersAPI.acceptParcel(parcelID)
      alert('Parcel accepted successfully!')
      loadData()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept parcel')
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
          <h1 className="text-xl font-semibold">Carrier Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/carrier/notifications')}
              className="relative"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 pt-4">
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('available')}
            className={`pb-3 px-2 font-medium ${
              activeTab === 'available'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600'
            }`}
          >
            Available ({availableParcels.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`pb-3 px-2 font-medium ${
              activeTab === 'my'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600'
            }`}
          >
            My Parcels ({myParcels.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : activeTab === 'available' ? (
        <div className="px-4 py-4 space-y-3">
          {availableParcels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No available parcels at the moment
            </div>
          ) : (
            availableParcels.map((parcel) => (
              <div
                key={parcel.ParcelID}
                className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-gray-800">
                      #{parcel.TrackingNumber}
                    </div>
                    <div className="text-sm text-gray-600">
                      From: {parcel.senderFirstName} {parcel.senderLastName}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(parcel.CreatedAt)}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-600">Origin: </span>
                    <span className="text-gray-800">
                      {parcel.orgAddress}, {parcel.orgDistrict}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Destination: </span>
                    <span className="text-gray-800">
                      {parcel.destAddress}, {parcel.destDistrict}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Weight: </span>
                    <span className="text-gray-800">{parcel.weight} kg</span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate(`/carrier/parcel/${parcel.ParcelID}`)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleAccept(parcel.ParcelID)}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {myParcels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              You haven't accepted any parcels yet
            </div>
          ) : (
            myParcels.map((parcel) => (
              <div
                key={parcel.ParcelID}
                onClick={() => navigate(`/carrier/parcel/${parcel.ParcelID}`)}
                className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-gray-800">
                      #{parcel.TrackingNumber}
                    </div>
                    <div className="text-sm text-gray-600">
                      {parcel.Status}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(parcel.CreatedAt)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">To: </span>
                    <span className="text-gray-800">
                      {parcel.destAddress}, {parcel.destDistrict}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Receiver: </span>
                    <span className="text-gray-800">
                      {parcel.receiverName} ({parcel.receiverPhone})
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default CarrierHome

