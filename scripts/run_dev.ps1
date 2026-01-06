$ErrorActionPreference = 'Stop'

$workspace = 'C:\Users\diego\OneDrive\Desktop\Banco'
$py = 'C:/Users/diego/OneDrive/Desktop/Banco/.venv/Scripts/python.exe'

# SEGURIDAD: Leer credenciales de variables de entorno
$mysqlContainer = 'banco-mysql'
$mysqlRootPassword = $env:MYSQL_ROOT_PASSWORD
if (-not $mysqlRootPassword) {
    Write-Host "ERROR: Variable MYSQL_ROOT_PASSWORD no definida" -ForegroundColor Red
    exit 1
}
$mysqlDb = $env:MYSQL_NAME
if (-not $mysqlDb) { $mysqlDb = 'loan_system_db' }
$mysqlUser = $env:MYSQL_USER
if (-not $mysqlUser) { $mysqlUser = 'loan_user' }
$mysqlPassword = $env:MYSQL_PASSWORD
if (-not $mysqlPassword) {
    Write-Host "ERROR: Variable MYSQL_PASSWORD no definida" -ForegroundColor Red
    exit 1
}
$mysqlHost = '127.0.0.1'
$mysqlPort = '3307'

Write-Host "1. Verificando Docker..." -ForegroundColor Cyan
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker no esta disponible. Abre Docker Desktop y reintenta.'
}

Write-Host "2. Iniciando contenedor MySQL ($mysqlContainer)..." -ForegroundColor Cyan
$exists = docker ps -a --format '{{.Names}}' | Select-String -SimpleMatch $mysqlContainer
if (-not $exists) {
  docker run -d --name $mysqlContainer `
    -e "MYSQL_ROOT_PASSWORD=$mysqlRootPassword" `
    -e "MYSQL_DATABASE=$mysqlDb" `
    -e "MYSQL_USER=$mysqlUser" `
    -e "MYSQL_PASSWORD=$mysqlPassword" `
    -p "$mysqlPort`:3306" mysql:8.0 *> $null
} else {
  docker start $mysqlContainer *> $null
}

Write-Host "3. Esperando a que MySQL este listo..." -ForegroundColor Cyan
for ($i = 0; $i -lt 60; $i++) {
  docker exec -e "MYSQL_PWD=$mysqlRootPassword" $mysqlContainer mysqladmin ping -uroot --silent 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}

# Force the app user password
docker exec -e "MYSQL_PWD=$mysqlRootPassword" $mysqlContainer mysql -uroot -e "ALTER USER '$mysqlUser'@'%' IDENTIFIED BY '$mysqlPassword'; FLUSH PRIVILEGES;" 2>$null | Out-Null

# DB env
$env:MYSQL_NAME = $mysqlDb
$env:MYSQL_USER = $mysqlUser
$env:MYSQL_PASSWORD = $mysqlPassword
$env:MYSQL_HOST = $mysqlHost
$env:MYSQL_PORT = $mysqlPort

Set-Location $workspace

Write-Host "4. Aplicando migraciones..." -ForegroundColor Cyan
& $py loan_system/manage.py migrate

Write-Host "5. Verificando datos iniciales (Seed)..." -ForegroundColor Cyan
& $py loan_system/manage.py seed_initial_data

Write-Host "6. Iniciando servidor Django en http://127.0.0.1:8000 ..." -ForegroundColor Green
Write-Host "(Presiona Ctrl+C para detener)" -ForegroundColor Yellow

& $py loan_system/manage.py runserver 127.0.0.1:8000
