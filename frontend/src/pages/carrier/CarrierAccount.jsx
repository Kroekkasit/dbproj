import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, AuthContext } from '../../context/AuthContext'
import { carriersAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const CarrierAccount = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { showAlert } = useContext(AuthContext)
  const [carrier, setCarrier] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    phone: '',
    email: '',
    vehInfo: '',
    vehLicense: '',
    EmploymentType: 'Independent',
    isAvailable: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await carriersAPI.getProfile()
      const carrierData = response.data.carrier
      setCarrier(carrierData)
      setFormData({
        firstname: carrierData.firstname || '',
        lastname: carrierData.lastname || '',
        phone: carrierData.phone || '',
        email: carrierData.email || '',
        vehInfo: carrierData.vehInfo || '',
        vehLicense: carrierData.vehLicense || '',
        EmploymentType: carrierData.EmploymentType || 'Independent',
        isAvailable: carrierData.isAvailable !== undefined ? carrierData.isAvailable : true
      })
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      await carriersAPI.updateProfile(formData)
      await loadProfile()
      setShowForm(false)
      showAlert('Success', 'Profile updated successfully!', 'success')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/carrier/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

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
          <h1 className="text-xl font-semibold">Account</h1>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white px-4 py-6 mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <span className="text-2xl font-semibold text-white">
              {carrier?.firstname?.[0]}{carrier?.lastname?.[0]}
            </span>
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-800">
              {carrier?.firstname} {carrier?.lastname}
            </div>
            <div className="text-sm text-gray-600">{carrier?.email}</div>
            <div className="text-sm text-gray-600">{carrier?.phone}</div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white px-4 py-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600">Availability Status</div>
            <div className={`text-lg font-semibold ${carrier?.isAvailable ? 'text-green-600' : 'text-gray-600'}`}>
              {carrier?.isAvailable ? 'Available' : 'Not Available'}
            </div>
          </div>
          <button
            onClick={() => {
              const newStatus = !formData.isAvailable
              setFormData({ ...formData, isAvailable: newStatus })
              carriersAPI.updateProfile({ isAvailable: newStatus }).then(() => {
                loadProfile()
              })
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              carrier?.isAvailable
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {carrier?.isAvailable ? 'Set Unavailable' : 'Set Available'}
          </button>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white px-4 py-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Profile Information</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-primary text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
              <div className="text-xs text-gray-500 mt-1">Email cannot be changed</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Information
              </label>
              <input
                type="text"
                name="vehInfo"
                value={formData.vehInfo}
                onChange={handleChange}
                placeholder="e.g., Motorcycle, Van, Truck"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle License Plate
              </label>
              <input
                type="text"
                name="vehLicense"
                value={formData.vehLicense}
                onChange={handleChange}
                placeholder="e.g., กก 1234"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type
              </label>
              <select
                name="EmploymentType"
                value={formData.EmploymentType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="Independent">Independent</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setError('')
                  loadProfile()
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Vehicle</div>
              <div className="font-medium text-gray-800">
                {carrier?.vehInfo || 'Not specified'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">License Plate</div>
              <div className="font-medium text-gray-800">
                {carrier?.vehLicense || 'Not specified'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Employment Type</div>
              <div className="font-medium text-gray-800">
                {carrier?.EmploymentType || 'Not specified'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="px-4">
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

export default CarrierAccount

