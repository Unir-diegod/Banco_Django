import axios from 'axios'

// Event bus para notificaciones globales de errores
const errorEventBus = new EventTarget()

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 segundos
})

const refreshClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

let isRefreshing = false
let refreshPromise = null

// Helper para mostrar notificaciones
export function onApiError(callback) {
  const handler = (event) => callback(event.detail)
  errorEventBus.addEventListener('api-error', handler)
  return () => errorEventBus.removeEventListener('api-error', handler)
}

function emitError(error) {
  errorEventBus.dispatchEvent(new CustomEvent('api-error', { detail: error }))
}

// Interceptor de request - agregar token y request ID
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    
    // Agregar request ID para tracking
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Interceptor de response - manejo de errores y refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config
    const status = error?.response?.status
    const errorData = error?.response?.data

    // Construir objeto de error estructurado
    const structuredError = {
      status: status || 0,
      message: errorData?.message || error.message || 'Error desconocido',
      detail: errorData?.detail || null,
      errors: errorData?.errors || null,
      timestamp: new Date().toISOString(),
      url: originalRequest?.url,
      method: originalRequest?.method?.toUpperCase(),
    }

    // Manejar errores de red
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        structuredError.message = 'La solicitud tardó demasiado tiempo'
      } else if (error.message === 'Network Error') {
        structuredError.message = 'Error de conexión. Verifica tu internet.'
      }
      emitError(structuredError)
      return Promise.reject(structuredError)
    }

    // Nunca intentar refresh si la request fallida ya era el refresh
    if (originalRequest?.url?.includes('/auth/token/refresh/')) {
      emitError({ ...structuredError, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' })
      return Promise.reject(structuredError)
    }

    // Manejo de 401 - Token expirado
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        emitError({ ...structuredError, message: 'Sesión expirada' })
        window.location.href = '/login'
        return Promise.reject(structuredError)
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
            emitError({ message: 'Sesión expirada. Redirigiendo al login...' })
            setTimeout(() => {
              window.location.href = '/login'
            }, 1000)
            throw refreshError
          })
          .finally(() => {
            isRefreshing = false
            refreshPromise = null
          })
      }

      try {
        const newAccess = await refreshPromise
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        return Promise.reject(structuredError)
      }
    }

    // Manejo específico por código de estado
    switch (status) {
      case 400:
        structuredError.message = errorData?.message || 'Datos inválidos'
        break
      case 403:
        structuredError.message = errorData?.message || 'No tienes permiso para esta acción'
        break
      case 404:
        structuredError.message = errorData?.message || 'Recurso no encontrado'
        break
      case 409:
        structuredError.message = errorData?.message || 'Conflicto en la operación'
        break
      case 422:
        structuredError.message = errorData?.message || 'Error de validación'
        break
      case 429:
        structuredError.message = 'Demasiadas solicitudes. Por favor espera un momento.'
        break
      case 500:
      case 502:
      case 503:
      case 504:
        structuredError.message = 'Error del servidor. Intenta nuevamente más tarde.'
        break
    }

    // Emitir error para componentes que escuchan
    emitError(structuredError)
    
    return Promise.reject(structuredError)
  }
)
