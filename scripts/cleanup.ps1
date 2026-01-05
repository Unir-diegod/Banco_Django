$ErrorActionPreference = 'Stop'

Write-Host "`n=== LIMPIEZA DE ARCHIVOS INNECESARIOS ===" -ForegroundColor Cyan

$workspace = 'C:\Users\diego\OneDrive\Desktop\Banco'
Set-Location $workspace

# Archivos a eliminar
$filesToDelete = @(
    # Archivos PID y logs temporales
    "scripts\backend.pid",
    "scripts\frontend.pid",
    "scripts\backend.out.log",
    "scripts\backend.err.log",
    "scripts\frontend.out.log",
    "scripts\frontend.err.log",
    
    # Scripts de testing/debug obsoletos
    "scripts\check_data.py",
    "scripts\fix_passwords.py",
    "scripts\generate_hash.py",
    "scripts\test_api.py",
    "scripts\test_api_v2.py",
    "scripts\execute_sql.py",
    
    # Scripts de populate obsoletos (ya existe seed en Django)
    "scripts\populate_db_clean.sql",
    "scripts\populate_db_v5.sql",
    
    # Scripts de PowerShell redundantes
    "scripts\validate_frontend_flow.ps1"
)

# Directorios __pycache__ a eliminar
$pycacheDirs = @(
    "__pycache__",
    "application\__pycache__",
    "domain\__pycache__",
    "events\__pycache__",
    "infrastructure\__pycache__",
    "interfaces\__pycache__",
    "scripts\__pycache__"
)

$deletedCount = 0
$failedCount = 0

# Eliminar archivos
Write-Host "`nEliminando archivos temporales y obsoletos..." -ForegroundColor Yellow
foreach ($file in $filesToDelete) {
    $fullPath = Join-Path $workspace $file
    if (Test-Path $fullPath) {
        try {
            Remove-Item -Path $fullPath -Force
            Write-Host "[OK] Eliminado: $file" -ForegroundColor Green
            $deletedCount++
        }
        catch {
            Write-Host "[ERROR] No se pudo eliminar: $file" -ForegroundColor Red
            $failedCount++
        }
    }
}

# Eliminar directorios __pycache__
Write-Host "`nEliminando directorios __pycache__..." -ForegroundColor Yellow
foreach ($dir in $pycacheDirs) {
    $fullPath = Join-Path $workspace $dir
    if (Test-Path $fullPath) {
        try {
            Remove-Item -Path $fullPath -Recurse -Force
            Write-Host "[OK] Eliminado: $dir" -ForegroundColor Green
            $deletedCount++
        }
        catch {
            Write-Host "[ERROR] No se pudo eliminar: $dir" -ForegroundColor Red
            $failedCount++
        }
    }
}

Write-Host "`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Elementos eliminados: $deletedCount" -ForegroundColor Green
if ($failedCount -gt 0) {
    Write-Host "Elementos fallidos: $failedCount" -ForegroundColor Red
}

Write-Host "`n=== VERIFICANDO .gitignore ===" -ForegroundColor Cyan
$gitignorePath = Join-Path $workspace ".gitignore"
$gitignoreContent = Get-Content $gitignorePath -Raw

$entriesToAdd = @()

# Verificar entradas necesarias
if ($gitignoreContent -notmatch "(?m)^\.pid$") {
    $entriesToAdd += "*.pid"
}
if ($gitignoreContent -notmatch "(?m)^\*\.out\.log$") {
    $entriesToAdd += "*.out.log"
}
if ($gitignoreContent -notmatch "(?m)^\*\.err\.log$") {
    $entriesToAdd += "*.err.log"
}

if ($entriesToAdd.Count -gt 0) {
    Write-Host "Agregando entradas a .gitignore..." -ForegroundColor Yellow
    $gitignoreContent += "`n# Script runtime files`n"
    foreach ($entry in $entriesToAdd) {
        $gitignoreContent += "$entry`n"
    }
    Set-Content -Path $gitignorePath -Value $gitignoreContent.TrimEnd()
    Write-Host "[OK] .gitignore actualizado" -ForegroundColor Green
}
else {
    Write-Host "[OK] .gitignore ya tiene las entradas necesarias" -ForegroundColor Green
}

Write-Host "`n=== ARCHIVOS IMPORTANTES QUE SE MANTIENEN ===" -ForegroundColor Cyan
Write-Host "[KEEP] scripts\docker_setup.ps1 - Configuracion de Docker" -ForegroundColor White
Write-Host "[KEEP] scripts\run_dev.ps1 - Script principal de desarrollo" -ForegroundColor White
Write-Host "[KEEP] scripts\start_backend.ps1 - Inicio de backend" -ForegroundColor White
Write-Host "[KEEP] scripts\start_frontend.ps1 - Inicio de frontend" -ForegroundColor White
Write-Host "[KEEP] scripts\e2e_mysql.ps1 - Tests end-to-end" -ForegroundColor White
Write-Host "[KEEP] scripts\reset_db.py - Resetear base de datos" -ForegroundColor White

Write-Host "`n[OK] Limpieza completada!" -ForegroundColor Green
