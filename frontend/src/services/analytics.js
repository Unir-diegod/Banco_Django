import { apiClient } from './apiClient'

/**
 * Obtiene los datos de analytics del dashboard
 * @returns {Promise<Object>} Datos de analytics
 * @throws {Object} Error estructurado con información del fallo
 */
export async function fetchDashboardAnalytics() {
  try {
    const { data } = await apiClient.get('/analytics/dashboard/')
    return data
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)
    // Re-lanzar el error para que el componente lo maneje
    throw error
  }
}

/**
 * Obtiene datos de analytics con retry automático
 * @param {number} maxRetries - Número máximo de reintentos
 * @returns {Promise<Object>} Datos de analytics
 */
export async function fetchDashboardAnalyticsWithRetry(maxRetries = 3) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchDashboardAnalytics()
    } catch (error) {
      lastError = error
      
      // No reintentar en errores 4xx (excepto 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error
      }
      
      // Esperar antes de reintentar (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}
