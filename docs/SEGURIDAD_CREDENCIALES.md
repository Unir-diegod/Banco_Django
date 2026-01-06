# 🔐 GUÍA DE SEGURIDAD - CONFIGURACIÓN DE CREDENCIALES

## ⚠️ ADVERTENCIA CRÍTICA
**NUNCA** commitear el archivo `.env` al repositorio Git. Este archivo contiene credenciales sensibles.

## 📋 Configuración Inicial (Primera vez)

### 1. Generar credenciales seguras

Ejecuta el comando Django para generar todas las credenciales:

```bash
python loan_system/manage.py generate_secrets --all
```

Esto generará:
- `DJANGO_SECRET_KEY` (50+ caracteres)
- `MYSQL_PASSWORD` (32 caracteres)
- `MYSQL_ROOT_PASSWORD` (48 caracteres)

### 2. Crear archivo .env

Copia la plantilla según el entorno:

**Desarrollo:**
```bash
cp .env.example .env
```

**Producción:**
```bash
cp .env.production.example .env
```

### 3. Configurar .env con credenciales generadas

Edita `.env` y reemplaza:
- `change-me-to-random-secret-key` con el SECRET_KEY generado
- `change-me-secure-password` con MYSQL_PASSWORD generado

### 4. Configurar variables de entorno en PowerShell (Alternativa)

Para evitar passwords en archivos, usa variables de sesión:

```powershell
# En PowerShell (cada sesión)
$env:DJANGO_SECRET_KEY = "tu-secret-key-generado"
$env:MYSQL_ROOT_PASSWORD = "tu-root-password-generado"
$env:MYSQL_PASSWORD = "tu-password-generado"
```

Para hacerlo permanente (usuario):
```powershell
[Environment]::SetEnvironmentVariable("MYSQL_ROOT_PASSWORD", "tu-password", "User")
[Environment]::SetEnvironmentVariable("MYSQL_PASSWORD", "tu-password", "User")
```

## 🛡️ Verificación de Seguridad

### Verificar que .env está en .gitignore

```bash
git check-ignore .env
```

Debe retornar: `.env` (confirmando que está ignorado)

### Verificar que NO hay credenciales en Git

```bash
git log --all --full-history --source --pretty=format: --name-only --diff-filter=D | grep ".env"
```

Si aparece `.env`, DEBES limpiar el historial de Git.

## 🚨 Rotación de Credenciales

### Cuando rotar credenciales:
- Sospecha de compromiso
- Empleado con acceso se va
- Cada 90 días (buena práctica)
- Antes de producción

### Proceso de rotación:

1. Generar nuevas credenciales:
```bash
python loan_system/manage.py generate_secrets --all
```

2. Actualizar `.env` con nuevos valores

3. Reiniciar servicios:
```powershell
.\scripts\start_backend.ps1
```

4. Invalidar tokens JWT antiguos (si habilitaste blacklist):
```bash
python loan_system/manage.py flush_expired_tokens
```

## 📊 Niveles de Seguridad por Entorno

### Desarrollo (Local)
- ✅ SECRET_KEY único (no usar el de ejemplo)
- ✅ Passwords fuertes generados
- ✅ DEBUG=1 permitido
- ⚠️ CORS permisivo (localhost)

### Staging/QA
- ✅ SECRET_KEY diferente a desarrollo
- ✅ DEBUG=0
- ✅ CORS restrictivo (solo dominio staging)
- ✅ SSL/HTTPS habilitado
- ✅ HSTS habilitado

### Producción
- ✅ SECRET_KEY único y fuerte (50+ chars)
- ✅ DEBUG=0 (SIEMPRE)
- ✅ CORS solo dominios autorizados
- ✅ SSL/HTTPS obligatorio
- ✅ HSTS con preload
- ✅ Passwords rotativos (cada 90 días)
- ✅ Logs de auditoría habilitados
- ✅ Rate limiting estricto

## 🔧 Herramientas Adicionales

### Escaneo de secretos en Git (pre-commit)

Instalar `detect-secrets`:
```bash
pip install detect-secrets
```

Escanear repositorio:
```bash
detect-secrets scan --all-files --force-use-all-plugins
```

### Validar fuerza de passwords

En Python:
```python
import secrets
password = secrets.token_urlsafe(32)  # Mínimo recomendado
print(f"Bits de entropía: {len(password) * 6}")  # ~192 bits
```

## 📝 Checklist Pre-Producción

- [ ] `.env` en `.gitignore`
- [ ] SECRET_KEY generado con `generate_secrets`
- [ ] DEBUG=0 en producción
- [ ] ALLOWED_HOSTS configurado correctamente
- [ ] CORS_ALLOWED_ORIGINS solo dominios autorizados
- [ ] SSL_REDIRECT=1
- [ ] HSTS habilitado
- [ ] Base de datos con usuario NO root
- [ ] Passwords >32 caracteres
- [ ] JWT blacklist habilitado
- [ ] Logs de auditoría activos
- [ ] Rate limiting configurado
- [ ] Content-Security-Policy habilitado

## 🆘 Emergencia: Credenciales Comprometidas

1. **INMEDIATO**: Rotar TODAS las credenciales
2. **Invalidar**: Todos los tokens JWT activos
3. **Revisar**: Logs de auditoría por accesos sospechosos
4. **Notificar**: Al equipo y usuarios si es necesario
5. **Investigar**: Cómo se comprometieron
6. **Documentar**: Incidente para prevención futura
