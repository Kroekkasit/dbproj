import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { parcelsAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const SenderHistory = () => {
  const navigate = useNavigate()
  const [parcels, setParcels] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const filteredParcels = parcels.filter(parcel =>
    parcel.TrackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parcel.receiverName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedParcels = filteredParcels.reduce((acc, parcel) => {
    const date = formatDate(parcel.CreatedAt)
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(parcel)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/sender')}
            className="mr-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">History</h1>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="flex-1 px-4 py-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <button className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : Object.keys(groupedParcels).length === 0 ? (
        <div className="text-center py-8 text-gray-500">No shipments found</div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {Object.entries(groupedParcels).map(([date, dateParcels]) => (
            <div key={date} className="space-y-3">
              {dateParcels.map((parcel) => (
                <div
                  key={parcel.ParcelID}
                  onClick={() => navigate(`/sender/parcel/${parcel.ParcelID}`)}
                  className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm text-gray-600">{date}</div>
                    <div className="text-sm text-gray-500">Order id #{parcel.TrackingNumber}</div>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="w-0.5 h-8 bg-primary mt-1"></div>
                      <div className="w-5 h-5 bg-primary rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">Request Accepted</div>
                      <div className="text-xs text-gray-500">{formatDate(parcel.CreatedAt)}</div>
                      <div className="text-sm font-medium text-gray-800 mt-2">Parcel Picked</div>
                      <div className="text-xs text-gray-500">{formatDate(parcel.UpdatedAt)}</div>
                    </div>
                  </div>

                  {/* Status and Details */}
                  <div className="flex justify-between items-center">
                    <div className={`px-3 py-1 rounded text-sm font-medium ${
                      parcel.Status === 'Delivered'
                        ? 'bg-green-100 text-green-800'
                        : parcel.Status === 'In Transit'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {parcel.Status}
                    </div>
                    <div className="text-right">
                      {parcel.Price && (
                        <div className="text-primary font-semibold">฿{parseFloat(parcel.Price).toFixed(2)}</div>
                      )}
                      <div className="text-xs text-gray-600">Net Wt: {parcel.weight || 0} Kg</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default SenderHistory

