import axios from 'axios'

const API_URL = '/api'

// Auth API
export const authAPI = {
  senderRegister: (data) => axios.post(`${API_URL}/auth/sender/register`, data),
  senderLogin: (data) => axios.post(`${API_URL}/auth/sender/login`, data),
  carrierRegister: (data) => axios.post(`${API_URL}/auth/carrier/register`, data),
  carrierLogin: (data) => axios.post(`${API_URL}/auth/carrier/login`, data),
}

// Parcels API
export const parcelsAPI = {
  create: (data) => axios.post(`${API_URL}/parcels`, data),
  calculate: (data) => axios.post(`${API_URL}/parcels/calculate`, data),
  getSenderParcels: () => axios.get(`${API_URL}/parcels/sender`),
  getByTracking: (trackingNumber) => axios.get(`${API_URL}/parcels/track/${trackingNumber}`),
  getById: (parcelID) => axios.get(`${API_URL}/parcels/${parcelID}`),
  notifyCarriers: (parcelID) => axios.post(`${API_URL}/parcels/${parcelID}/notify`),
}

// Addresses API
export const addressesAPI = {
  create: (data) => axios.post(`${API_URL}/addresses`, data),
  getMyAddress: () => axios.get(`${API_URL}/addresses/me`),
  getAll: () => axios.get(`${API_URL}/addresses/all`),
  update: (data) => axios.put(`${API_URL}/addresses/me`, data),
  updateById: (userLocationID, data) => axios.put(`${API_URL}/addresses/${userLocationID}`, data),
  delete: (userLocationID) => axios.delete(`${API_URL}/addresses/${userLocationID}`),
  getLocations: () => axios.get(`${API_URL}/addresses/locations`),
}

// Carriers API
export const carriersAPI = {
  getProfile: () => axios.get(`${API_URL}/carriers/profile`),
  updateProfile: (data) => axios.put(`${API_URL}/carriers/profile`, data),
  getAvailableParcels: () => axios.get(`${API_URL}/carriers/available-parcels`),
  acceptParcel: (parcelID) => axios.post(`${API_URL}/carriers/accept-parcel/${parcelID}`),
  submitMeasurements: (parcelID, data) => axios.post(`${API_URL}/carriers/submit-measurements/${parcelID}`, data),
  getMyParcels: () => axios.get(`${API_URL}/carriers/my-parcels`),
  updateStatus: (parcelID, data) => axios.post(`${API_URL}/carriers/update-status/${parcelID}`, data),
}

// Packages API
export const packagesAPI = {
  getAll: () => axios.get(`${API_URL}/packages`),
}

// Notifications API
export const notificationsAPI = {
  getSenderNotifications: () => axios.get(`${API_URL}/notifications/sender`),
  getCarrierNotifications: () => axios.get(`${API_URL}/notifications/carrier`),
  markAsRead: (notificationID) => axios.put(`${API_URL}/notifications/${notificationID}/read`),
  markAllAsRead: () => axios.put(`${API_URL}/notifications/read-all`),
}

// Provinces API
export const provincesAPI = {
  getAll: () => axios.get(`${API_URL}/provinces`),
}

// Banks API
export const banksAPI = {
  getAll: () => axios.get(`${API_URL}/banks`),
}

// Balance API
export const balanceAPI = {
  get: () => axios.get(`${API_URL}/balance`),
  topup: (data) => axios.post(`${API_URL}/balance/topup`, data),
  getTransactions: () => axios.get(`${API_URL}/balance/transactions`),
}

