import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { parcelsAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const SenderDeliveryStatus = () => {
  const { parcelID, trackingNumber } = useParams()
  const navigate = useNavigate()
  const [parcel, setParcel] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState(false)

  useEffect(() => {
    loadParcel()
  }, [parcelID, trackingNumber])

  const loadParcel = async () => {
    try {
      let response
      if (parcelID) {
        response = await parcelsAPI.getById(parcelID)
      } else if (trackingNumber) {
        response = await parcelsAPI.getByTracking(trackingNumber)
      } else {
        return
      }

      setParcel(response.data.parcel)
      setEvents(response.data.events || [])
    } catch (error) {
      console.error('Failed to load parcel:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotifyCarriers = async () => {
    if (!parcelID) return
    
    setNotifying(true)
    try {
      await parcelsAPI.notifyCarriers(parcelID)
      alert('Carriers have been notified!')
      loadParcel()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to notify carriers')
    } finally {
      setNotifying(false)
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

  // Calculate pricing breakdown
  const getPricingBreakdown = () => {
    if (!parcel) return null

    const packagePrice = parseFloat(parcel.PackagePrice) || 0
    const deliveryPrice = parseFloat(parcel.Price) || 0
    const fastDeliveryFee = parseFloat(parcel.FastDeliveryFee) || 0
    const serviceFee = parseFloat(parcel.ServiceFee) || 0
    
    // Calculate base delivery price (delivery price includes fast fee if applicable)
    const baseDeliveryPrice = deliveryPrice - fastDeliveryFee
    const subtotal = packagePrice + deliveryPrice + serviceFee

    return {
      packagePrice,
      baseDeliveryPrice: baseDeliveryPrice > 0 ? baseDeliveryPrice : null,
      fastDeliveryFee,
      serviceFee,
      deliveryPrice,
      subtotal,
      hasDeliveryPrice: !!parcel.Price,
      hasMeasurements: !!(parcel.weight && parcel.dimension_x && parcel.dimension_y && parcel.dimension_z),
      deliveryPlanName: parcel.deliveryPlanName,
      services: parcel.services || []
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!parcel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Parcel not found</div>
          <button
            onClick={() => navigate('/sender')}
            className="text-primary"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  const canNotify = parcel.Status === 'Pending' && !parcel.assignmentStatus
  const pricing = getPricingBreakdown()
  const waitingForMeasurements = !parcel.weight || !parcel.dimension_x || !parcel.dimension_y || !parcel.dimension_z

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
          <h1 className="text-xl font-semibold">Delivery Status</h1>
        </div>
        <div className="text-sm opacity-90">Estimated Delivery Date</div>
        <div className="text-2xl font-bold">
          {parcel.EstDeliveryDate ? formatDate(parcel.EstDeliveryDate) : 'TBD'}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white mx-4 mt-4 rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Track Order</h2>
          <div className="text-sm text-gray-500">Order id #{parcel.TrackingNumber}</div>
        </div>
        
        {/* Pricing Breakdown */}
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Pricing Breakdown</h3>
          
          <div className="space-y-2">
            {/* Package Price */}
            {pricing && pricing.packagePrice > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Package Price:</span>
                <span className="text-sm font-medium text-gray-800">
                  ฿{pricing.packagePrice.toFixed(2)}
                </span>
              </div>
            )}

            {/* Service Fees */}
            {pricing && pricing.serviceFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Service Fees:</span>
                <span className="text-sm font-medium text-green-600">
                  ฿{pricing.serviceFee.toFixed(2)}
                  {pricing.services && pricing.services.length > 0 && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({pricing.services.map(s => s.Name).join(', ')})
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Delivery Price Breakdown */}
            {pricing && pricing.hasDeliveryPrice ? (
              <>
                {pricing.baseDeliveryPrice !== null && pricing.baseDeliveryPrice > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Base Delivery Price:</span>
                    <span className="text-sm font-medium text-blue-600">
                      ฿{pricing.baseDeliveryPrice.toFixed(2)}
                    </span>
                  </div>
                )}
                {pricing.fastDeliveryFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fast Delivery Fee:</span>
                    <span className="text-sm font-medium text-orange-600">
                      +฿{pricing.fastDeliveryFee.toFixed(2)}
                      {pricing.deliveryPlanName && (
                        <span className="text-xs text-gray-500 ml-1">({pricing.deliveryPlanName})</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Total Delivery:</span>
                  <span className="text-sm font-medium text-gray-800">
                    ฿{pricing.deliveryPrice.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Delivery Price:</span>
                <span className="text-sm font-medium text-yellow-600 italic">
                  Waiting for carrier to measure
                </span>
              </div>
            )}

            <div className="border-t-2 border-gray-300 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold">Total Price:</span>
                <span className="text-lg font-bold text-primary">
                  {pricing && pricing.hasDeliveryPrice ? (
                    `฿${pricing.subtotal.toFixed(2)}`
                  ) : (
                    <span className="text-yellow-600 italic">
                      ฿{(pricing.packagePrice + pricing.serviceFee).toFixed(2)} + Delivery (TBD)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Measurement Status */}
          {waitingForMeasurements && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <div className="font-medium mb-1">⚠️ Measurements Pending</div>
              <div className="space-y-1">
                {!parcel.weight && <div>• Weight: Waiting for carrier to measure</div>}
                {(!parcel.dimension_x || !parcel.dimension_y || !parcel.dimension_z) && (
                  <div>• Dimensions: Waiting for carrier to measure</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-6">
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
              <div className="flex-1 pb-6">
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

          {events.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tracking events yet
            </div>
          )}
        </div>
      </div>

      {/* Package Info Section */}
      <div className="bg-white mx-4 mt-4 rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Package Information</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Receiver:</span>
            <span className="text-sm font-medium text-gray-800">{parcel.receiverName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Weight:</span>
            <span className="text-sm font-medium text-gray-800">
              {parcel.weight ? `${parcel.weight} kg` : <span className="text-yellow-600 italic">Waiting for carrier to measure</span>}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Dimensions:</span>
            <span className="text-sm font-medium text-gray-800">
              {parcel.dimension_x && parcel.dimension_y && parcel.dimension_z ? (
                `${parcel.dimension_x} × ${parcel.dimension_y} × ${parcel.dimension_z} cm`
              ) : (
                <span className="text-yellow-600 italic">Waiting for carrier to measure</span>
              )}
            </span>
          </div>
          {parcel.packageName && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Package Type:</span>
              <span className="text-sm font-medium text-gray-800">
                {parcel.packageName} {parcel.packageSize && `(${parcel.packageSize})`}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Item Type:</span>
            <span className="text-sm font-medium text-gray-800">{parcel.itemType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Destination:</span>
            <span className="text-sm font-medium text-gray-800 text-right">
              {parcel.destAddress && <div>{parcel.destAddress}</div>}
              <div>{parcel.destDistrict}, {parcel.destProvince}</div>
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {canNotify && (
        <div className="px-4 mt-6">
          <button
            onClick={handleNotifyCarriers}
            disabled={notifying}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {notifying ? 'Notifying...' : 'Notify Carriers'}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default SenderDeliveryStatus
