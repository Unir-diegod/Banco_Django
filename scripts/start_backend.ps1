$ErrorActionPreference = 'Stop'

$workspace = 'C:\Users\diego\OneDrive\Desktop\Banco'
$py = 'C:/Users/diego/OneDrive/Desktop/Banco/.venv/Scripts/python.exe'

# SEGURIDAD: Leer credenciales de variables de entorno o .env
$mysqlContainer = 'banco-mysql'
$mysqlRootPassword = $env:MYSQL_ROOT_PASSWORD
if (-not $mysqlRootPassword) {
    Write-Host "ERROR: Variable MYSQL_ROOT_PASSWORD no definida" -ForegroundColor Red
    Write-Host "Define: `$env:MYSQL_ROOT_PASSWORD = 'tu-password-seguro'" -ForegroundColor Yellow
    exit 1
}
$mysqlDb = $env:MYSQL_NAME
if (-not $mysqlDb) { $mysqlDb = 'loan_system_db' }
$mysqlUser = $env:MYSQL_USER
if (-not $mysqlUser) { $mysqlUser = 'loan_user' }
$mysqlPassword = $env:MYSQL_PASSWORD
if (-not $mysqlPassword) {
    Write-Host "ERROR: Variable MYSQL_PASSWORD no definida" -ForegroundColor Red
    Write-Host "Define: `$env:MYSQL_PASSWORD = 'tu-password-seguro'" -ForegroundColor Yellow
    exit 1
}
$mysqlHost = $env:MYSQL_HOST
if (-not $mysqlHost) { $mysqlHost = '127.0.0.1' }
$mysqlPort = $env:MYSQL_PORT
if (-not $mysqlPort) { $mysqlPort = '3307' }

Write-Host 'Backend: verificando Docker...' -ForegroundColor Cyan
$useDocker = $true
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  $useDocker = $false
  Write-Host 'Docker no esta disponible. Se usara SQLite (modo sin Docker).' -ForegroundColor Yellow
}

if ($useDocker) {
  Write-Host "Backend: iniciando MySQL Docker ($mysqlContainer)..." -ForegroundColor Cyan
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

  Write-Host 'Backend: esperando MySQL...' -ForegroundColor Cyan
  for ($i = 0; $i -lt 60; $i++) {
    docker exec -e "MYSQL_PWD=$mysqlRootPassword" $mysqlContainer mysqladmin ping -uroot --silent 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
  }

  # Force password (idempotente)
  docker exec -e "MYSQL_PWD=$mysqlRootPassword" $mysqlContainer mysql -uroot -e "ALTER USER '$mysqlUser'@'%' IDENTIFIED BY '$mysqlPassword'; FLUSH PRIVILEGES;" 2>$null | Out-Null

  # Export env for Django process
  $env:MYSQL_NAME = $mysqlDb
  $env:MYSQL_USER = $mysqlUser
  $env:MYSQL_PASSWORD = $mysqlPassword
  $env:MYSQL_HOST = $mysqlHost
  $env:MYSQL_PORT = $mysqlPort
} else {
  # Asegurar fallback a SQLite
  Remove-Item Env:MYSQL_NAME -ErrorAction SilentlyContinue
  Remove-Item Env:MYSQL_USER -ErrorAction SilentlyContinue
  Remove-Item Env:MYSQL_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:MYSQL_HOST -ErrorAction SilentlyContinue
  Remove-Item Env:MYSQL_PORT -ErrorAction SilentlyContinue
}

Set-Location $workspace

Write-Host 'Backend: migraciones + seed...' -ForegroundColor Cyan
& $py loan_system/manage.py migrate | Out-Null
& $py loan_system/manage.py seed_initial_data | Out-Null

# Stop any existing runserver on 8000 (best-effort)
$line = (netstat -ano | Select-String ':8000\s+LISTENING' | Select-Object -First 1)
if ($line) {
  $parts = ($line -split '\s+')
  $procId = $parts[-1]
  if ($procId -match '^\d+$') {
    try { Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue } catch {}
  }
}

Write-Host 'Backend: iniciando Django (127.0.0.1:8000)...' -ForegroundColor Green
$outLog = Join-Path $workspace 'scripts\backend.out.log'
$errLog = Join-Path $workspace 'scripts\backend.err.log'

# Limpia logs previos (best-effort)
try { Remove-Item -Path $outLog -Force -ErrorAction SilentlyContinue } catch {}
try { Remove-Item -Path $errLog -Force -ErrorAction SilentlyContinue } catch {}

$proc = Start-Process -FilePath $py -WorkingDirectory $workspace -ArgumentList @('loan_system/manage.py','runserver','127.0.0.1:8000','--noreload') -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WindowStyle Hidden -PassThru
$pidFile = Join-Path $workspace 'scripts\backend.pid'
Set-Content -Path $pidFile -Value $proc.Id

# Health check simple
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    if (-not (Get-Process -Id $proc.Id -ErrorAction Stop)) { break }
  } catch {
    break
  }

  try {
    $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) { $ok = $true; break }
  } catch {
    # ignore
  }
}

if (-not $ok) {
  Write-Host "Backend NO pudo iniciar (PID=$($proc.Id)). Revisa logs:" -ForegroundColor Red
  Write-Host "- $outLog" -ForegroundColor Red
  Write-Host "- $errLog" -ForegroundColor Red
  if (Test-Path $errLog) {
    Write-Host '--- backend.err.log (ultimas 60 lineas) ---' -ForegroundColor Yellow
    Get-Content $errLog -Tail 60
  }
  exit 1
}

Write-Host "Backend OK. PID=$($proc.Id). URL=http://127.0.0.1:8000" -ForegroundColor Green
