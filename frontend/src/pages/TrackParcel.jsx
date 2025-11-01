import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parcelsAPI } from '../services/api'

const TrackParcel = () => {
  const navigate = useNavigate()
  const [trackingNumber, setTrackingNumber] = useState('')
  const [parcel, setParcel] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTrack = async (e) => {
    e.preventDefault()
    setError('')
    setParcel(null)
    setEvents([])

    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number')
      return
    }

    setLoading(true)
    try {
      const response = await parcelsAPI.getByTracking(trackingNumber.trim())
      setParcel(response.data.parcel)
      setEvents(response.data.events || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Parcel not found')
      setParcel(null)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Delivered': return 'bg-green-100 text-green-800'
      case 'In Transit': return 'bg-blue-100 text-blue-800'
      case 'Available': return 'bg-yellow-100 text-yellow-800'
      case 'Pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-2">Track Your Parcel</h1>
          <p className="text-sm opacity-90">Enter your tracking number to see delivery status</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="px-4 py-6">
        <form onSubmit={handleTrack} className="max-w-md mx-auto">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              placeholder="Enter tracking number"
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Tracking...' : 'Track Parcel'}
          </button>
        </form>

        {error && (
          <div className="max-w-md mx-auto mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {parcel && (
        <div className="px-4 pb-8">
          <div className="max-w-md mx-auto">
            {/* Parcel Info Card */}
            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Tracking Number</div>
                  <div className="text-xl font-bold text-gray-800">#{parcel.TrackingNumber}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(parcel.Status)}`}>
                  {parcel.Status}
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div>
                  <div className="text-xs text-gray-500">Receiver</div>
                  <div className="text-sm font-medium text-gray-800">{parcel.receiverName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Destination</div>
                  <div className="text-sm text-gray-800">
                    {parcel.destAddress || parcel.destDistrict ? (
                      <>
                        {parcel.destAddress && <div>{parcel.destAddress}</div>}
                        <div>{parcel.destDistrict}, {parcel.destProvince}</div>
                      </>
                    ) : (
                      <div>{parcel.destDistrict || 'N/A'}, {parcel.destProvince || 'N/A'}</div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Estimated Delivery</div>
                  <div className="text-sm font-medium text-gray-800">
                    {parcel.EstDeliveryDate ? formatDate(parcel.EstDeliveryDate) : 'TBD'}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-bold mb-4">Delivery Timeline</h2>
              
              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tracking events yet
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div key={event.EventID} className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          index < events.length - 1 ? 'bg-primary' : 'bg-primary border-2 border-white'
                        }`}>
                          {index < events.length - 1 && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {index < events.length - 1 && (
                          <div className="w-0.5 h-full bg-primary mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="font-semibold text-gray-800">{event.EventType}</div>
                        <div className="text-sm text-gray-500">{formatDateTime(event.EventTime)}</div>
                        {event.Description && (
                          <div className="text-sm text-gray-600 mt-1">{event.Description}</div>
                        )}
                        {event.Address && (
                          <div className="text-xs text-gray-500 mt-1">
                            {event.Address}, {event.District}, {event.Province}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-6 text-center">
        <button
          onClick={() => navigate(-1)}
          className="text-primary text-sm hover:underline"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}

export default TrackParcel

