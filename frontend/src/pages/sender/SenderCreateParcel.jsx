import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { parcelsAPI, addressesAPI, provincesAPI, balanceAPI, packagesAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const SenderCreateParcel = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    receiverName: '',
    receiverPhone: '',
    orgLocationID: '',
    destAddress: '',
    destDistrict: '',
    destSubdistrict: '',
    destProvince: '',
    destCountry: 'Thailand',
    itemType: '',
    useOwnPackage: true,
    SelectedPackageID: null
  })
  const [locations, setLocations] = useState([])
  const [provinces, setProvinces] = useState([])
  const [packages, setPackages] = useState([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [priceInfo, setPriceInfo] = useState(null)
  const [calculatingPrice, setCalculatingPrice] = useState(false)

  const itemTypes = ['Food', 'Frozen', 'Electronics', 'Clothing', 'Documents', 'Other']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [locationsRes, provincesRes, balanceRes, packagesRes] = await Promise.all([
        addressesAPI.getLocations(),
        provincesAPI.getAll(),
        balanceAPI.get(),
        packagesAPI.getAll()
      ])
      setLocations(locationsRes.data.locations)
      setProvinces(provincesRes.data.provinces)
      setBalance(balanceRes.data.balance)
      setPackages(packagesRes.data.packages)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : (name === 'SelectedPackageID' ? (value ? parseInt(value) : null) : value),
      // Reset package selection if switching to own package
      ...(name === 'useOwnPackage' && checked ? { SelectedPackageID: null } : {})
    })
  }

  // Calculate price when relevant form data changes
  useEffect(() => {
    const calculatePrice = async () => {
      // Only calculate if we have minimum required fields
      if (!formData.destProvince || !formData.orgLocationID) {
        setPriceInfo(null)
        return
      }

      setCalculatingPrice(true)
      try {
        const response = await parcelsAPI.calculate({
          orgLocationID: parseInt(formData.orgLocationID),
          destProvince: formData.destProvince,
          SelectedPackageID: formData.SelectedPackageID,
          useOwnPackage: formData.useOwnPackage
        })
        setPriceInfo(response.data)
      } catch (error) {
        console.error('Failed to calculate price:', error)
        setPriceInfo(null)
      } finally {
        setCalculatingPrice(false)
      }
    }

    // Debounce calculation
    const timeoutId = setTimeout(calculatePrice, 300)
    return () => clearTimeout(timeoutId)
  }, [formData.orgLocationID, formData.destProvince, formData.SelectedPackageID, formData.useOwnPackage])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.useOwnPackage && !formData.SelectedPackageID) {
      setError('Please select a package or choose to use your own package')
      return
    }

    setLoading(true)

    try {
      const submitData = {
        ...formData,
        useOwnPackage: formData.useOwnPackage,
        SelectedPackageID: formData.useOwnPackage ? null : formData.SelectedPackageID
      }

      const response = await parcelsAPI.create(submitData)
      alert('Parcel created successfully! You can now notify carriers.')
      navigate(`/sender/parcel/${response.data.parcel.parcelID}`)
    } catch (err) {
      if (err.response?.data?.required && err.response?.data?.current) {
        setError(`Insufficient balance. Required: ฿${err.response.data.required.toFixed(2)}, Current: ฿${err.response.data.current.toFixed(2)}`)
      } else {
        setError(err.response?.data?.message || 'Failed to create parcel')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/sender')}
            className="mr-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">Create Parcel</h1>
        </div>
        <div className="text-sm">
          Balance: <span className="font-bold">฿{balance.toFixed(2)}</span>
        </div>
      </div>

      <div className="px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Receiver Information */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Receiver Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receiver Name *
                </label>
                <input
                  type="text"
                  name="receiverName"
                  value={formData.receiverName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receiver Phone *
                </label>
                <input
                  type="tel"
                  name="receiverPhone"
                  value={formData.receiverPhone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Item Type */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Item Type</h2>
            <select
              name="itemType"
              value={formData.itemType}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select item type *</option>
              {itemTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Packaging Options */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Packaging</h2>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="useOwnPackage"
                  checked={formData.useOwnPackage}
                  onChange={handleChange}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">I will use my own package</span>
              </label>

              {!formData.useOwnPackage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Package Container *
                  </label>
                  <div className="space-y-2">
                    {packages.map(pkg => (
                      <label
                        key={pkg.PackageTypeID}
                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.SelectedPackageID === pkg.PackageTypeID
                            ? 'border-primary bg-primary bg-opacity-5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="SelectedPackageID"
                          value={pkg.PackageTypeID}
                          checked={formData.SelectedPackageID === pkg.PackageTypeID}
                          onChange={handleChange}
                          className="mr-3 text-primary"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">
                            {pkg.Name}
                            {pkg.Size && <span className="ml-2 text-sm text-gray-600">({pkg.Size})</span>}
                          </div>
                          <div className="text-sm text-gray-600">
                            {pkg.dimension_x} × {pkg.dimension_y} × {pkg.dimension_z} cm
                          </div>
                        </div>
                        <div className="text-primary font-semibold">
                          ฿{parseFloat(pkg.Price).toFixed(2)}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Origin Location */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Pickup Location</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Pickup Address *
              </label>
              <select
                name="orgLocationID"
                value={formData.orgLocationID}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select pickup address *</option>
                {locations.map(location => (
                  <option key={location.LocationID} value={location.LocationID}>
                    {location.Name || 'Address'} - {location.Address}, {location.District}, {location.Subdistrict}, {location.Province}
                  </option>
                ))}
              </select>
              {locations.length === 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-700">
                  No addresses found. Please{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/sender/account')}
                    className="text-primary underline font-medium"
                  >
                    add your address
                  </button>{' '}
                  first.
                </div>
              )}
              {formData.orgLocationID && locations.find(l => l.LocationID === parseInt(formData.orgLocationID)) && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                  Selected: {locations.find(l => l.LocationID === parseInt(formData.orgLocationID)).Address}, {locations.find(l => l.LocationID === parseInt(formData.orgLocationID)).District}
                </div>
              )}
            </div>
          </div>

          {/* Destination */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Destination</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  name="destAddress"
                  value={formData.destAddress}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District *
                </label>
                <input
                  type="text"
                  name="destDistrict"
                  value={formData.destDistrict}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subdistrict *
                </label>
                <input
                  type="text"
                  name="destSubdistrict"
                  value={formData.destSubdistrict}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province *
                </label>
                <select
                  name="destProvince"
                  value={formData.destProvince}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select Province</option>
                  {provinces.map(province => (
                    <option key={province.ProvinceID} value={province.Name}>
                      {province.Name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Price Calculation */}
          {(priceInfo || calculatingPrice) && (
            <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-primary">
              <h2 className="text-lg font-semibold mb-3">Price Calculation</h2>
              {calculatingPrice ? (
                <div className="text-sm text-gray-600">Calculating...</div>
              ) : priceInfo ? (
                <div className="space-y-2">
                  {priceInfo.packagePrice > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">Package Price</span>
                      <span className="font-semibold">฿{priceInfo.packagePrice.toFixed(2)}</span>
                    </div>
                  )}
                  {priceInfo.estimatedDeliveryPrice !== null ? (
                    <>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-gray-600">Estimated Delivery Price</span>
                        <span className="font-semibold text-blue-600">฿{priceInfo.estimatedDeliveryPrice.toFixed(2)}</span>
                      </div>
                      {priceInfo.estimatedDeliveryDate && (
                        <div className="text-xs text-gray-500 mt-2">
                          Estimated delivery: {new Date(priceInfo.estimatedDeliveryDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-2 border-b">
                      <span className="text-sm text-gray-600">
                        {formData.useOwnPackage 
                          ? 'Delivery price will be calculated after carrier measures the parcel'
                          : 'Delivery price will be calculated after carrier measures the weight'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                    <span className="font-semibold text-lg">Total</span>
                    <span className="font-bold text-primary text-xl">
                      {priceInfo.totalPrice > 0 
                        ? `฿${priceInfo.totalPrice.toFixed(2)}`
                        : 'TBD'}
                    </span>
                  </div>
                  {priceInfo.packagePrice > 0 && priceInfo.estimatedDeliveryPrice === null && (
                    <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded">
                      ⓘ You will be charged ฿{priceInfo.packagePrice.toFixed(2)} for the package now. Delivery price will be calculated and charged after pickup.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Parcel'}
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  )
}

export default SenderCreateParcel
