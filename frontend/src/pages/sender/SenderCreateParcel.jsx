import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { parcelsAPI, addressesAPI, provincesAPI, balanceAPI, packagesAPI, deliveryPlansAPI, optionalServicesAPI } from '../../services/api'
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
  const [deliveryPlans, setDeliveryPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null) // Default to Standard
  const [optionalServices, setOptionalServices] = useState([])
  const [selectedServices, setSelectedServices] = useState([]) // Array of service IDs

  const itemTypes = ['Food', 'Frozen', 'Electronics', 'Clothing', 'Documents', 'Other']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [locationsRes, provincesRes, balanceRes, packagesRes, plansRes, servicesRes] = await Promise.all([
        addressesAPI.getLocations(),
        provincesAPI.getAll(),
        balanceAPI.get(),
        packagesAPI.getAll(),
        deliveryPlansAPI.getAll(),
        optionalServicesAPI.getAll()
      ])
      setLocations(locationsRes.data.locations)
      setProvinces(provincesRes.data.provinces)
      setBalance(balanceRes.data.balance)
      setPackages(packagesRes.data.packages)
      setDeliveryPlans(plansRes.data.plans)
      setOptionalServices(servicesRes.data.services)
      
      // Set default plan to Standard
      const standardPlan = plansRes.data.plans.find(p => p.Name === 'Standard')
      if (standardPlan) {
        setSelectedPlan(standardPlan.PlanID)
      }
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
          useOwnPackage: formData.useOwnPackage,
          deliveryPlanID: selectedPlan,
          selectedServiceIDs: selectedServices
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
  }, [formData.orgLocationID, formData.destProvince, formData.SelectedPackageID, formData.useOwnPackage, selectedPlan, selectedServices])

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
        SelectedPackageID: formData.useOwnPackage ? null : formData.SelectedPackageID,
        deliveryPlanID: selectedPlan,
        selectedServiceIDs: selectedServices
      }

      const response = await parcelsAPI.create(submitData)
      alert('Parcel created successfully! You can now notify carriers.')
      navigate(`/sender/parcel/${response.data.parcel.parcelID}`)
    } catch (err) {
      if (err.response?.data?.required !== undefined && err.response?.data?.current !== undefined) {
        const required = typeof err.response.data.required === 'number' ? err.response.data.required : parseFloat(err.response.data.required) || 0;
        const current = typeof err.response.data.current === 'number' ? err.response.data.current : parseFloat(err.response.data.current) || 0;
        const breakdown = err.response.data.breakdown;
        
        let errorMsg = `Insufficient balance. Required: ฿${required.toFixed(2)}, Current: ฿${current.toFixed(2)}`;
        
        if (breakdown) {
          const breakdownParts = [];
          if (breakdown.packagePrice > 0) breakdownParts.push(`Package: ฿${parseFloat(breakdown.packagePrice).toFixed(2)}`);
          if (breakdown.serviceFee > 0) breakdownParts.push(`Services: ฿${parseFloat(breakdown.serviceFee).toFixed(2)}`);
          if (breakdownParts.length > 0) {
            errorMsg += ` (${breakdownParts.join(', ')})`;
          }
        }
        
        setError(errorMsg);
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

          {/* Delivery Plan */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Delivery Plan</h2>
            <div className="space-y-2">
              {deliveryPlans.map(plan => (
                <label
                  key={plan.PlanID}
                  className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedPlan === plan.PlanID
                      ? 'border-primary bg-primary bg-opacity-5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryPlan"
                    value={plan.PlanID}
                    checked={selectedPlan === plan.PlanID}
                    onChange={(e) => setSelectedPlan(parseInt(e.target.value))}
                    className="mt-1 mr-3 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 flex items-center">
                      {plan.Name}
                      {plan.Name === 'Fast' && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                          Express
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {plan.Description}
                    </div>
                    {plan.FastDeliveryFee > 0 && (
                      <div className="text-sm text-primary font-semibold mt-1">
                        +฿{parseFloat(plan.FastDeliveryFee).toFixed(2)} additional fee
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Services */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Optional Services</h2>
            <div className="space-y-3">
              {optionalServices.map(service => (
                <label
                  key={service.ServiceID}
                  className="flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors border-gray-200 hover:border-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service.ServiceID)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedServices([...selectedServices, service.ServiceID])
                      } else {
                        setSelectedServices(selectedServices.filter(id => id !== service.ServiceID))
                      }
                    }}
                    className="mt-1 mr-3 text-primary rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 flex items-center">
                      {service.Name}
                      {service.Name === 'Care+' && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                          Insurance
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {service.Description}
                    </div>
                    {service.CoverageAmount && (
                      <div className="text-xs text-gray-500 mt-1">
                        Coverage: ฿{parseFloat(service.CoverageAmount).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="text-primary font-semibold ml-2">
                    +฿{parseFloat(service.ServiceFee).toFixed(2)}
                  </div>
                </label>
              ))}
              {optionalServices.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No optional services available
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
                  {priceInfo.serviceFee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">Service Fees</span>
                      <span className="font-semibold text-green-600">฿{priceInfo.serviceFee.toFixed(2)}</span>
                    </div>
                  )}
                  {priceInfo.baseDeliveryPrice !== null && priceInfo.baseDeliveryPrice !== undefined ? (
                    <>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-gray-600">Base Delivery Price</span>
                        <span className="font-semibold text-blue-600">฿{priceInfo.baseDeliveryPrice.toFixed(2)}</span>
                      </div>
                      {priceInfo.fastDeliveryFee > 0 && (
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Fast Delivery Fee</span>
                          <span className="font-semibold text-orange-600">+฿{priceInfo.fastDeliveryFee.toFixed(2)}</span>
                        </div>
                      )}
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
                  {(priceInfo.packagePrice > 0 || priceInfo.serviceFee > 0) && priceInfo.baseDeliveryPrice === null && (
                    <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded">
                      ⓘ You will be charged ฿{(priceInfo.packagePrice + (priceInfo.serviceFee || 0)).toFixed(2)} {(priceInfo.packagePrice > 0 && priceInfo.serviceFee > 0) ? '(package + services)' : priceInfo.packagePrice > 0 ? '(package)' : '(services)'} now. Delivery price will be calculated and charged after pickup.
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
