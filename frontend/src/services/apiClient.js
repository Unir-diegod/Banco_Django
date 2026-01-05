import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
})

const refreshClient = axios.create({
  baseURL: '/api',
})

let isRefreshing = false
let refreshPromise = null

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token')
  if (accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config
    const status = error?.response?.status

    // Nunca intentar refresh si la request fallida ya era el refresh
    if (originalRequest?.url?.includes('/auth/token/refresh/')) {
      return Promise.reject(error)
    }

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = refreshClient
        .post('/auth/token/refresh/', { refresh: refreshToken })
        .then((resp) => {
          localStorage.setItem('access_token', resp.data.access)
          return resp.data.access
        })
        .catch((refreshError) => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
          throw refreshError
        })
        .finally(() => {
          isRefreshing = false
          refreshPromise = null
        })
    }

    const newAccess = await refreshPromise
    originalRequest.headers = originalRequest.headers ?? {}
    originalRequest.headers.Authorization = `Bearer ${newAccess}`
    return apiClient(originalRequest)
  }
)
