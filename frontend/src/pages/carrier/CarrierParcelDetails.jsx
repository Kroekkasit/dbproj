import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { parcelsAPI, carriersAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const CarrierParcelDetails = () => {
  const { parcelID } = useParams()
  const navigate = useNavigate()
  const [parcel, setParcel] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [statusForm, setStatusForm] = useState({
    eventType: '',
    status: '',
    description: '',
    locationID: ''
  })
  const [measurementForm, setMeasurementForm] = useState({
    weight: '',
    dimension_x: '',
    dimension_y: '',
    dimension_z: ''
  })
  const [submittingMeasurements, setSubmittingMeasurements] = useState(false)

  useEffect(() => {
    loadParcel()
  }, [parcelID])

  const loadParcel = async () => {
    try {
      const response = await parcelsAPI.getById(parcelID)
      setParcel(response.data.parcel)
      setEvents(response.data.events || [])
    } catch (error) {
      console.error('Failed to load parcel:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)

    try {
      await carriersAPI.updateStatus(parcelID, statusForm)
      alert('Status updated successfully!')
      setStatusForm({ eventType: '', status: '', description: '', locationID: '' })
      loadParcel()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleAccept = async () => {
    if (!window.confirm('Accept this parcel assignment? You will need to pick it up and measure it.')) return

    try {
      await carriersAPI.acceptParcel(parcelID)
      alert('Parcel accepted successfully! Please proceed to pickup location and submit measurements.')
      loadParcel()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept parcel')
    }
  }

  const handleSubmitMeasurements = async (e) => {
    e.preventDefault()
    setSubmittingMeasurements(true)

    try {
      // Prepare data - only include dimensions if sender uses own package
      const submitData = {
        weight: parseFloat(measurementForm.weight)
      }
      
      // Only include dimensions if sender uses their own package (no SelectedPackageID)
      if (!parcel.SelectedPackageID) {
        if (!measurementForm.dimension_x || !measurementForm.dimension_y || !measurementForm.dimension_z) {
          alert('Please fill in all dimensions (Length, Width, Height)')
          setSubmittingMeasurements(false)
          return
        }
        submitData.dimension_x = parseFloat(measurementForm.dimension_x)
        submitData.dimension_y = parseFloat(measurementForm.dimension_y)
        submitData.dimension_z = parseFloat(measurementForm.dimension_z)
      }

      const response = await carriersAPI.submitMeasurements(parcelID, submitData)
      const totalPrice = response.data.totalPrice || response.data.price
      alert(`Measurements submitted! Final total price: ฿${parseFloat(totalPrice).toFixed(2)} (Delivery: ฿${parseFloat(response.data.deliveryPrice || 0).toFixed(2)} + Package: ฿${parseFloat(response.data.packagePrice || 0).toFixed(2)})`)
      setMeasurementForm({ weight: '', dimension_x: '', dimension_y: '', dimension_z: '' })
      loadParcel()
    } catch (error) {
      console.error('Submit measurements error:', error)
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || error.message || 'Failed to submit measurements'
      alert(errorMsg)
    } finally {
      setSubmittingMeasurements(false)
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
            onClick={() => navigate('/carrier')}
            className="text-primary"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  const isAssigned = parcel.assignmentStatus === 'Accepted' && parcel.CarrierID
  const canAccept = parcel.Status === 'Pending' && !isAssigned
  const needsMeasurements = parcel.Status === 'Awaiting Pickup' && isAssigned && !parcel.weight

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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
          <h1 className="text-xl font-semibold">Parcel Details</h1>
        </div>
      </div>

      {/* Parcel Info */}
      <div className="bg-white mx-4 mt-4 rounded-lg p-4 shadow-sm">
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-1">Tracking Number</div>
          <div className="text-lg font-semibold">#{parcel.TrackingNumber}</div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <div className="font-medium">{parcel.Status}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Receiver</div>
            <div className="font-medium">{parcel.receiverName}</div>
            <div className="text-sm text-gray-600">{parcel.receiverPhone}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Origin</div>
            <div className="font-medium">{parcel.orgAddress}</div>
            <div className="text-sm text-gray-600">
              {parcel.orgDistrict}, {parcel.orgProvince}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Destination</div>
            <div className="font-medium">{parcel.destAddress}</div>
            <div className="text-sm text-gray-600">
              {parcel.destDistrict}, {parcel.destProvince}
            </div>
          </div>

          {parcel.itemType && (
            <div>
              <div className="text-sm text-gray-500">Item Type</div>
              <div className="font-medium">{parcel.itemType}</div>
            </div>
          )}

          {parcel.SelectedPackageID ? (
            <div>
              <div className="text-sm text-gray-500">Package</div>
              <div className="font-medium">
                {parcel.packageName} {parcel.packageSize && `(${parcel.packageSize})`}
              </div>
              <div className="text-xs text-gray-600">
                Dimensions: {parcel.packageDimensionX} × {parcel.packageDimensionY} × {parcel.packageDimensionZ} cm
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-500">Package</div>
              <div className="font-medium">Sender's own package</div>
            </div>
          )}

          {parcel.weight ? (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              <div>
                <div className="text-sm text-gray-500">Weight</div>
                <div className="font-medium">{parcel.weight} kg</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Dimensions</div>
                <div className="font-medium">
                  {parcel.dimension_x} × {parcel.dimension_y} × {parcel.dimension_z} cm
                </div>
              </div>
              {parcel.Price && (
                <div className="col-span-2 pt-2 border-t">
                  <div className="text-sm text-gray-500">Final Price</div>
                  <div className="font-semibold text-primary text-lg">฿{parseFloat(parcel.Price).toFixed(2)}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-3 border-t text-sm text-gray-600">
              Measurements pending - please submit after pickup
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white mx-4 mt-4 rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Delivery Timeline</h2>
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      {canAccept && (
        <div className="px-4 mt-6">
          <button
            onClick={handleAccept}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark"
          >
            Accept Parcel
          </button>
        </div>
      )}

      {/* Measurement Form - After accepting, before pickup */}
      {needsMeasurements && (
        <div className="bg-white mx-4 mt-4 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Submit Measurements</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please measure the parcel at pickup location. 
            {parcel.SelectedPackageID 
              ? ' Package dimensions are fixed, only weight is needed.' 
              : ' Provide both weight and dimensions.'}
          </p>
          <form onSubmit={handleSubmitMeasurements} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={measurementForm.weight}
                onChange={(e) => setMeasurementForm({ ...measurementForm, weight: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="0.0"
              />
            </div>

            {!parcel.SelectedPackageID && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Length (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={measurementForm.dimension_x}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, dimension_x: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={measurementForm.dimension_y}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, dimension_y: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={measurementForm.dimension_z}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, dimension_z: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="0"
                    />
                  </div>
                </div>
              </>
            )}

            {parcel.SelectedPackageID && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-600">
                Package dimensions: {parcel.packageDimensionX} × {parcel.packageDimensionY} × {parcel.packageDimensionZ} cm
              </div>
            )}

            <button
              type="submit"
              disabled={submittingMeasurements}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {submittingMeasurements ? 'Submitting...' : 'Submit Measurements & Calculate Price'}
            </button>
          </form>
        </div>
      )}

      {/* Status Update Form */}
      {isAssigned && !needsMeasurements && parcel.weight && (
        <div className="bg-white mx-4 mt-4 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Update Status</h3>
          <form onSubmit={handleStatusUpdate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type *
              </label>
              <select
                value={statusForm.eventType}
                onChange={(e) => setStatusForm({ ...statusForm, eventType: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">Select event</option>
                <option value="Parcel Picked">Parcel Picked</option>
                <option value="In Transit">In Transit</option>
                <option value="Reached Warehouse">Reached Warehouse</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={statusForm.status}
                onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">Select status</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={statusForm.description}
                onChange={(e) => setStatusForm({ ...statusForm, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="Optional description..."
              />
            </div>

            <button
              type="submit"
              disabled={updating}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Status'}
            </button>
          </form>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default CarrierParcelDetails

