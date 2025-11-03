import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

export const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userType = localStorage.getItem('userType')
    const userData = localStorage.getItem('userData')

    if (token && userData) {
      setUser({ ...JSON.parse(userData), type: userType })
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    setLoading(false)
  }, [])

  const login = (token, userData, userType) => {
    localStorage.setItem('token', token)
    localStorage.setItem('userType', userType)
    localStorage.setItem('userData', JSON.stringify(userData))
    setUser({ ...userData, type: userType })
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userType')
    localStorage.removeItem('userData')
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  const showAlert = (title, message, type = 'info') => {
    setAlert({ title, message, type })
  }

  const hideAlert = () => {
    setAlert(null)
  }

  const showConfirm = (title, message, onConfirm, onCancel) => {
    setConfirm({ title, message, onConfirm, onCancel })
  }

  const hideConfirm = () => {
    setConfirm(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, showAlert, hideAlert, showConfirm, hideConfirm }}>
      {children}
      {/* Alert Modal */}
      {alert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center mb-4">
              {/* Icon based on type */}
              {alert.type === 'success' && (
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {alert.type === 'error' && (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {alert.type === 'warning' && (
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
              {(alert.type === 'info' || !alert.type) && (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <h3 className="text-xl font-semibold text-gray-900">{alert.title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{alert.message}</p>
            <button
              onClick={hideAlert}
              className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{confirm.title}</h3>
              <p className="text-gray-600">{confirm.message}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (confirm.onCancel) confirm.onCancel()
                  hideConfirm()
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirm.onConfirm) confirm.onConfirm()
                  hideConfirm()
                }}
                className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

