import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { addressesAPI, balanceAPI, provincesAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const SenderAccount = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState([])
  const [balance, setBalance] = useState(0)
  const [provinces, setProvinces] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [formData, setFormData] = useState({
    Name: '',
    Address: '',
    District: '',
    Subdistrict: '',
    Province: '',
    Country: 'Thailand'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([
      loadAddresses(),
      loadBalance(),
      loadProvinces()
    ])
  }

  const loadProvinces = async () => {
    try {
      const response = await provincesAPI.getAll()
      setProvinces(response.data.provinces)
    } catch (error) {
      console.error('Failed to load provinces:', error)
    }
  }

  const loadAddresses = async () => {
    try {
      const response = await addressesAPI.getAll()
      setAddresses(response.data.addresses || [])
    } catch (error) {
      console.error('Failed to load addresses:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBalance = async () => {
    try {
      const response = await balanceAPI.get()
      setBalance(response.data.balance)
    } catch (error) {
      console.error('Failed to load balance:', error)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleEdit = (address) => {
    setEditingAddress(address.UserLocationID)
    setFormData({
      Name: address.Name || '',
      Address: address.Address || '',
      District: address.District || '',
      Subdistrict: address.Subdistrict || '',
      Province: address.Province || '',
      Country: address.Country || 'Thailand'
    })
    setShowForm(true)
    setError('')
  }

  const handleAddNew = () => {
    setEditingAddress(null)
    setFormData({
      Name: '',
      Address: '',
      District: '',
      Subdistrict: '',
      Province: '',
      Country: 'Thailand'
    })
    setShowForm(true)
    setError('')
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingAddress(null)
    setFormData({
      Name: '',
      Address: '',
      District: '',
      Subdistrict: '',
      Province: '',
      Country: 'Thailand'
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (editingAddress) {
        await addressesAPI.updateById(editingAddress, formData)
      } else {
        await addressesAPI.create(formData)
      }
      await loadAddresses()
      handleCancel()
      alert('Address saved successfully!')
    } catch (err) {
      console.error('Address save error:', err)
      const errorMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || err.message || 'Failed to save address'
      setError(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userLocationID) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return
    }

    try {
      await addressesAPI.delete(userLocationID)
      await loadAddresses()
      alert('Address deleted successfully!')
    } catch (err) {
      console.error('Address delete error:', err)
      alert(err.response?.data?.message || 'Failed to delete address')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
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
        <h1 className="text-xl font-semibold">Account</h1>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* User Info */}
        <div className="bg-white px-4 py-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Profile</h2>
          </div>
          <div className="text-gray-700">
            <div className="mb-2">
              <span className="text-gray-500">Name:</span>{' '}
              <span className="font-medium">{user?.firstname} {user?.lastname}</span>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>{' '}
              <span className="font-medium">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Balance Section */}
        <div className="bg-white px-4 py-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Balance</h2>
            <button
              onClick={() => navigate('/sender/topup')}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              Top Up
            </button>
          </div>
          <div className="text-3xl font-bold text-primary">
            ฿{balance.toFixed(2)}
          </div>
        </div>

        {/* Addresses Section */}
        <div className="bg-white px-4 py-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">My Addresses</h2>
            {!showForm && (
              <button
                onClick={handleAddNew}
                className="text-primary text-sm font-medium flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Address
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Name *
                </label>
                <input
                  type="text"
                  name="Name"
                  value={formData.Name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Home, Office"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
                <textarea
                  name="Address"
                  value={formData.Address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subdistrict *
                </label>
                <input
                  type="text"
                  name="Subdistrict"
                  value={formData.Subdistrict}
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
                  name="District"
                  value={formData.District}
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
                  name="Province"
                  value={formData.Province}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  name="Country"
                  value={formData.Country}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingAddress ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {addresses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No addresses added yet</p>
                  <button
                    onClick={handleAddNew}
                    className="text-primary font-medium"
                  >
                    Add your first address
                  </button>
                </div>
              ) : (
                addresses.map((address) => (
                  <div
                    key={address.UserLocationID}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">
                          {address.Name}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>{address.Address}</div>
                          <div>
                            {address.Subdistrict}, {address.District}, {address.Province}
                          </div>
                          <div>{address.Country}</div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(address)}
                          className="p-2 text-primary hover:bg-primary hover:bg-opacity-10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(address.UserLocationID)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="bg-white px-4 py-4 rounded-lg shadow-sm">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default SenderAccount
