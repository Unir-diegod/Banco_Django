$ErrorActionPreference = 'Stop'

$workspace = 'C:\Users\diego\OneDrive\Desktop\Banco'
$frontendDir = Join-Path $workspace 'frontend'

$nodeExe = (Get-Command node -ErrorAction Stop).Source

# Instalar dependencias si hace falta
Set-Location $frontendDir
if (-not (Test-Path (Join-Path $frontendDir 'node_modules'))) {
  Write-Host 'Frontend: node_modules no existe, ejecutando npm install...' -ForegroundColor Cyan
  npm install
}

$viteJs = Join-Path $frontendDir 'node_modules\vite\bin\vite.js'
if (-not (Test-Path $viteJs)) {
  Write-Host 'Frontend: Vite no esta disponible, ejecutando npm install...' -ForegroundColor Cyan
  npm install
}

if (-not (Test-Path $viteJs)) {
  throw "No se encontró Vite en $viteJs. Revisa que npm install haya finalizado correctamente."
}

# Stop any existing process on 5173 (best-effort)
$line = (netstat -ano | Select-String ':5173\s+LISTENING' | Select-Object -First 1)
if ($line) {
  $parts = ($line -split '\s+')
  $procId = $parts[-1]
  if ($procId -match '^\d+$') {
    try { Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue } catch {}
  }
}

$outLog = Join-Path $workspace 'scripts\frontend.out.log'
$errLog = Join-Path $workspace 'scripts\frontend.err.log'
try { Remove-Item -Path $outLog -Force -ErrorAction SilentlyContinue } catch {}
try { Remove-Item -Path $errLog -Force -ErrorAction SilentlyContinue } catch {}

Write-Host 'Frontend: iniciando Vite (127.0.0.1:5173)...' -ForegroundColor Green
$proc = Start-Process -FilePath $nodeExe -WorkingDirectory $frontendDir -ArgumentList @($viteJs,'--host','127.0.0.1','--port','5173','--strictPort') -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WindowStyle Hidden -PassThru

$pidFile = Join-Path $workspace 'scripts\frontend.pid'
Set-Content -Path $pidFile -Value $proc.Id

# Health check
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    if (-not (Get-Process -Id $proc.Id -ErrorAction Stop)) { break }
  } catch {
    break
  }

  try {
    $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) { $ok = $true; break }
  } catch {
    # ignore
  }
}

if (-not $ok) {
  Write-Host "Frontend NO pudo iniciar (PID=$($proc.Id)). Revisa logs:" -ForegroundColor Red
  Write-Host "- $outLog" -ForegroundColor Red
  Write-Host "- $errLog" -ForegroundColor Red
  if (Test-Path $errLog) {
    Write-Host '--- frontend.err.log (ultimas 80 lineas) ---' -ForegroundColor Yellow
    Get-Content $errLog -Tail 80
  }
  exit 1
}

Write-Host "Frontend OK. PID=$($proc.Id). URL=http://127.0.0.1:5173" -ForegroundColor Green
