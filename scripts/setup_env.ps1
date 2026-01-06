# Script de configuración de variables de entorno
# Ejecutar: . .\scripts\setup_env.ps1

Write-Host "🔐 Configurando variables de entorno de seguridad..." -ForegroundColor Cyan

# Credenciales generadas - CAMBIAR EN PRODUCCIÓN
$env:MYSQL_ROOT_PASSWORD = 'Q6UreLd4SvBzSjaQU7L-13qkXw2skMdtTcUWtGYhzxE2a06-qVrKaYq5xM90lMQc'
$env:MYSQL_PASSWORD = 'yvxOkol_sI4YPQpt40JbXqdMcMQDwsZ0K0Pgchtx-u8'
$env:MYSQL_NAME = 'loan_system_db'
$env:MYSQL_USER = 'loan_user'
$env:MYSQL_HOST = '127.0.0.1'
$env:MYSQL_PORT = '3307'

Write-Host "✅ Variables de entorno configuradas:" -ForegroundColor Green
Write-Host "   MYSQL_ROOT_PASSWORD: ********" -ForegroundColor Gray
Write-Host "   MYSQL_PASSWORD: ********" -ForegroundColor Gray
Write-Host "   MYSQL_NAME: $env:MYSQL_NAME" -ForegroundColor Gray
Write-Host "   MYSQL_USER: $env:MYSQL_USER" -ForegroundColor Gray
Write-Host "   MYSQL_HOST: $env:MYSQL_HOST" -ForegroundColor Gray
Write-Host "   MYSQL_PORT: $env:MYSQL_PORT" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Estas variables solo están disponibles en esta sesión de PowerShell" -ForegroundColor Yellow
Write-Host "💡 Para hacerlas permanentes, usa el siguiente comando:" -ForegroundColor Cyan
Write-Host '   [Environment]::SetEnvironmentVariable("MYSQL_ROOT_PASSWORD", "tu-password", "User")' -ForegroundColor White
Write-Host ""
