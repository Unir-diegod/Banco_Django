import { apiClient } from './apiClient'

export async function fetchClients() {
  const { data } = await apiClient.get('/clients/')
  return data
}

export async function createClient(clientData) {
  const { data } = await apiClient.post('/clients/', clientData)
  return data
}
