import { apiClient } from './apiClient'

export async function fetchLoans() {
  const { data } = await apiClient.get('/loans/')
  return data
}

export async function createLoan(payload) {
  const { data } = await apiClient.post('/loans/', payload)
  return data
}
