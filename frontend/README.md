# Frontend (React + Vite)

UI del sistema de préstamos. En desarrollo, las llamadas a /api/* se proxyean al backend Django.

## Requisitos
- Node.js + npm
- Backend corriendo en http://127.0.0.1:8000

## Comandos
Desde esta carpeta (frontend/):
- npm install
- npm run dev
- npm run lint
- npm run build
- npm run preview

## Proxy API
Vite está configurado para proxyear /api hacia http://127.0.0.1:8000 (ver vite.config.js).

## Cliente HTTP
El cliente HTTP está centralizado en src/services/apiClient.js.
- baseURL: /api
- Adjunta Authorization: Bearer <access_token> si existe en localStorage.
