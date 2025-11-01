import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import LoginPage from './pages/LoginPage'
import SenderHome from './pages/sender/SenderHome'
import SenderCreateParcel from './pages/sender/SenderCreateParcel'
import SenderDeliveryStatus from './pages/sender/SenderDeliveryStatus'
import SenderHistory from './pages/sender/SenderHistory'
import SenderNotifications from './pages/sender/SenderNotifications'
import SenderAccount from './pages/sender/SenderAccount'
import SenderTopup from './pages/sender/SenderTopup'
import CarrierLoginPage from './pages/CarrierLoginPage'
import CarrierHome from './pages/carrier/CarrierHome'
import CarrierParcelDetails from './pages/carrier/CarrierParcelDetails'
import CarrierNotifications from './pages/carrier/CarrierNotifications'
import CarrierAccount from './pages/carrier/CarrierAccount'
import TrackParcel from './pages/TrackParcel'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/carrier/login" element={<CarrierLoginPage />} />
          <Route path="/track" element={<TrackParcel />} />
          
          {/* Sender Routes */}
          <Route path="/sender" element={<PrivateRoute requiredType="sender"><SenderHome /></PrivateRoute>} />
          <Route path="/sender/create" element={<PrivateRoute requiredType="sender"><SenderCreateParcel /></PrivateRoute>} />
          <Route path="/sender/track/:trackingNumber" element={<PrivateRoute requiredType="sender"><SenderDeliveryStatus /></PrivateRoute>} />
          <Route path="/sender/parcel/:parcelID" element={<PrivateRoute requiredType="sender"><SenderDeliveryStatus /></PrivateRoute>} />
          <Route path="/sender/history" element={<PrivateRoute requiredType="sender"><SenderHistory /></PrivateRoute>} />
          <Route path="/sender/notifications" element={<PrivateRoute requiredType="sender"><SenderNotifications /></PrivateRoute>} />
          <Route path="/sender/account" element={<PrivateRoute requiredType="sender"><SenderAccount /></PrivateRoute>} />
          <Route path="/sender/topup" element={<PrivateRoute requiredType="sender"><SenderTopup /></PrivateRoute>} />
          
          {/* Carrier Routes */}
          <Route path="/carrier" element={<PrivateRoute requiredType="carrier"><CarrierHome /></PrivateRoute>} />
          <Route path="/carrier/parcel/:parcelID" element={<PrivateRoute requiredType="carrier"><CarrierParcelDetails /></PrivateRoute>} />
          <Route path="/carrier/notifications" element={<PrivateRoute requiredType="carrier"><CarrierNotifications /></PrivateRoute>} />
          <Route path="/carrier/account" element={<PrivateRoute requiredType="carrier"><CarrierAccount /></PrivateRoute>} />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

