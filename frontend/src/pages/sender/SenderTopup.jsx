import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { banksAPI, balanceAPI } from '../../services/api'
import BottomNav from '../../components/BottomNav'

const SenderTopup = () => {
  const navigate = useNavigate()
  const [banks, setBanks] = useState([])
  const [balance, setBalance] = useState(0)
  const [formData, setFormData] = useState({
    amount: '',
    bankID: '',
    reference: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [banksRes, balanceRes] = await Promise.all([
        banksAPI.getAll(),
        balanceAPI.get()
      ])
      setBanks(banksRes.data.banks)
      setBalance(balanceRes.data.balance)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await balanceAPI.topup(formData)
      console.log('Topup response:', response) // Debug log
      
      if (response && response.data && response.data.amount !== undefined && response.data.newBalance !== undefined) {
        const successMsg = `Successfully topped up ฿${parseFloat(response.data.amount).toFixed(2)}. New balance: ฿${parseFloat(response.data.newBalance).toFixed(2)}`
        setSuccess(successMsg)
        setBalance(parseFloat(response.data.newBalance))
        setFormData({
          amount: '',
          bankID: '',
          reference: ''
        })
        
        // Refresh balance after 2 seconds
        setTimeout(() => {
          loadData()
        }, 2000)
      } else {
        console.error('Invalid topup response:', response)
        setError('Invalid response from server. Please try again.')
      }
    } catch (err) {
      console.error('Topup error:', err)
      setError(err.response?.data?.message || err.message || 'Failed to top up')
      setSuccess('') // Clear any previous success message
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
            onClick={() => navigate('/sender/account')}
            className="mr-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">Top Up Balance</h1>
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

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm font-medium">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">฿{balance.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Current Balance</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (฿) *
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="1"
              placeholder="Enter amount"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="mt-2 flex space-x-2">
              {[100, 500, 1000, 2000].map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: amount.toString() })}
                  className="px-4 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ฿{amount}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Bank *
            </label>
            <div className="space-y-2">
              {banks.map(bank => (
                <label
                  key={bank.BankID}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${
                    formData.bankID == bank.BankID
                      ? 'border-primary bg-primary bg-opacity-5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="bankID"
                    value={bank.BankID}
                    checked={formData.bankID == bank.BankID}
                    onChange={handleChange}
                    required
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{bank.Name}</div>
                    {bank.Code && (
                      <div className="text-xs text-gray-500">{bank.Code}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Reference (Optional)
            </label>
            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="e.g., Bank transfer reference number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="text-xs text-gray-500 mt-1">
              Optional: Enter your bank transaction reference number
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Top Up'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">How to Top Up</h3>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Enter the amount you want to top up</li>
            <li>Select your bank from the list</li>
            <li>Enter your transaction reference (optional)</li>
            <li>Click "Top Up" to add funds to your account</li>
          </ol>
          <p className="text-xs text-gray-500 mt-3 italic">
            Note: This is a demo system. Top-ups are processed immediately for testing purposes.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default SenderTopup

