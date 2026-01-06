# 🖥️ Frontend - Sistema de Préstamos

Interfaz de usuario para el Sistema de Préstamos Bancarios, construida con **React 18 + Vite**.

---

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# El frontend estará disponible en http://localhost:5173
```

> ⚠️ **Requisito:** El backend debe estar corriendo en `http://127.0.0.1:8000`

---

## 📁 Estructura

```
src/
├── components/       # Componentes reutilizables
│   ├── ui/              # Botones, inputs, modales
│   ├── ErrorBoundary    # Manejo de errores
│   └── ErrorNotification
│
├── pages/            # Páginas/Vistas
│   ├── Dashboard        # Panel principal
│   ├── Clients          # Gestión de clientes
│   ├── Loans            # Gestión de préstamos
│   ├── Reports          # Reportes
│   └── Login            # Autenticación
│
├── layouts/          # Layouts compartidos
│   └── DashboardLayout
│
├── services/         # Servicios API
│   ├── apiClient.js     # Cliente HTTP centralizado
│   ├── clients.js       # Endpoints de clientes
│   ├── loans.js         # Endpoints de préstamos
│   └── analytics.js     # Endpoints de reportes
│
└── assets/           # Recursos estáticos
```

---

## 🔧 Configuración

### Proxy API

Vite proxyea automáticamente `/api/*` al backend Django:

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
```

### Cliente HTTP

El cliente está centralizado en `src/services/apiClient.js`:
- Base URL: `/api`
- Añade automáticamente `Authorization: Bearer <token>` si existe en localStorage
- Maneja refresh de tokens

---

## 📜 Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Ejecutar ESLint |

---

## 🔐 Autenticación

El flujo de autenticación:

1. Usuario ingresa credenciales en `/login`
2. Frontend hace POST a `/api/auth/token/`
3. Backend devuelve `{access, refresh}`
4. Tokens se guardan en `localStorage`
5. `apiClient` añade token a cada request

```javascript
// src/services/apiClient.js
const token = localStorage.getItem('access_token');
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

---

## 🎨 Estilos

- CSS Modules para componentes
- Variables CSS para theming
- Diseño responsive

---

## 📚 Documentación Relacionada

- [API Reference](../docs/API.md) - Endpoints disponibles
- [Arquitectura](../docs/ARQUITECTURA.md) - Diseño del sistema
- [Desarrollo](../docs/DESARROLLO.md) - Guía para desarrolladores
