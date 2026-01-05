$ErrorActionPreference = 'Stop'

# Configuracion del contenedor MySQL
$mysqlContainer = 'banco-mysql'
$mysqlRootPassword = 'RootPass123!'
$mysqlDb = 'loan_system_db'
$mysqlUser = 'loan_user'
$mysqlPassword = 'TuContrasenaSegura123!'
$mysqlPort = '3307'

function Write-ColorOutput($message, $color) {
    Write-Host $message -ForegroundColor $color
}

# Verificar Docker
Write-ColorOutput "`n=== Verificando Docker ===" "Cyan"
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "ERROR: Docker no esta disponible." "Red"
    Write-ColorOutput "Asegurate de que Docker Desktop este iniciado." "Yellow"
    exit 1
}
Write-ColorOutput "[OK] Docker esta disponible" "Green"

# Verificar si el contenedor existe
Write-ColorOutput "`n=== Verificando contenedor MySQL ===" "Cyan"
$exists = docker ps -a --format '{{.Names}}' | Select-String -SimpleMatch $mysqlContainer

if (-not $exists) {
    Write-ColorOutput "Creando nuevo contenedor MySQL..." "Yellow"
    docker run -d --name $mysqlContainer `
        -e "MYSQL_ROOT_PASSWORD=$mysqlRootPassword" `
        -e "MYSQL_DATABASE=$mysqlDb" `
        -e "MYSQL_USER=$mysqlUser" `
        -e "MYSQL_PASSWORD=$mysqlPassword" `
        -p "$mysqlPort`:3306" `
        mysql:8.0
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "ERROR: No se pudo crear el contenedor MySQL" "Red"
        exit 1
    }
    Write-ColorOutput "[OK] Contenedor MySQL creado" "Green"
}
else {
    Write-ColorOutput "[OK] Contenedor MySQL ya existe" "Green"
}

# Iniciar el contenedor si esta detenido
$status = docker inspect -f '{{.State.Status}}' $mysqlContainer 2>$null
if ($status -ne "running") {
    Write-ColorOutput "Iniciando contenedor MySQL..." "Yellow"
    docker start $mysqlContainer | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "ERROR: No se pudo iniciar el contenedor MySQL" "Red"
        exit 1
    }
    Write-ColorOutput "[OK] Contenedor MySQL iniciado" "Green"
}
else {
    Write-ColorOutput "[OK] Contenedor MySQL ya esta corriendo" "Green"
}

# Esperar a que MySQL este listo
Write-ColorOutput "`n=== Esperando a que MySQL este listo ===" "Cyan"
$maxAttempts = 60
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts) {
    docker exec -e "MYSQL_PWD=$mysqlRootPassword" $mysqlContainer mysqladmin ping -uroot --silent 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    $attempt++
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    Write-ColorOutput "`nERROR: MySQL no respondio despues de $maxAttempts segundos" "Red"
    Write-ColorOutput "Logs del contenedor:" "Yellow"
    docker logs $mysqlContainer --tail 50
    exit 1
}

Write-ColorOutput "`n[OK] MySQL esta listo y respondiendo" "Green"

# Configurar usuario (asegurar password)
Write-ColorOutput "`n=== Configurando usuario de base de datos ===" "Cyan"
docker exec -e "MYSQL_PWD=$mysqlRootPassword" $mysqlContainer mysql -uroot -e "ALTER USER '$mysqlUser'@'%' IDENTIFIED BY '$mysqlPassword'; FLUSH PRIVILEGES;" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput "[OK] Usuario configurado correctamente" "Green"
}
else {
    Write-ColorOutput "[WARN] No se pudo configurar el usuario (puede que ya este configurado)" "Yellow"
}

# Verificar conexion
Write-ColorOutput "`n=== Verificando conexion a la base de datos ===" "Cyan"
docker exec -e "MYSQL_PWD=$mysqlPassword" $mysqlContainer mysql -u"$mysqlUser" -D"$mysqlDb" -e "SELECT 'Conexion exitosa' AS status;" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput "[OK] Conexion a la base de datos exitosa" "Green"
}
else {
    Write-ColorOutput "ERROR: No se pudo conectar a la base de datos" "Red"
    exit 1
}

# Mostrar informacion del contenedor
Write-ColorOutput "`n=== Informacion del contenedor ===" "Cyan"
Write-Host "Nombre:       " -NoNewline; Write-ColorOutput "$mysqlContainer" "White"
Write-Host "Puerto:       " -NoNewline; Write-ColorOutput "localhost:$mysqlPort" "White"
Write-Host "Base de datos:" -NoNewline; Write-ColorOutput "$mysqlDb" "White"
Write-Host "Usuario:      " -NoNewline; Write-ColorOutput "$mysqlUser" "White"
Write-Host "Estado:       " -NoNewline; Write-ColorOutput "CORRIENDO" "Green"

Write-ColorOutput "`n=== Variables de entorno para Django ===" "Cyan"
Write-ColorOutput "Agrega estas variables a tu .env:" "Yellow"
Write-Host "MYSQL_NAME=$mysqlDb"
Write-Host "MYSQL_USER=$mysqlUser"
Write-Host "MYSQL_PASSWORD=$mysqlPassword"
Write-Host "MYSQL_HOST=127.0.0.1"
Write-Host "MYSQL_PORT=$mysqlPort"

Write-ColorOutput "`n=== Comandos utiles ===" "Cyan"
Write-Host "Ver logs:     " -NoNewline; Write-ColorOutput "docker logs $mysqlContainer" "White"
Write-Host "Detener:      " -NoNewline; Write-ColorOutput "docker stop $mysqlContainer" "White"
Write-Host "Reiniciar:    " -NoNewline; Write-ColorOutput "docker restart $mysqlContainer" "White"
Write-Host "Eliminar:     " -NoNewline; Write-ColorOutput "docker rm -f $mysqlContainer" "White"
Write-Host "Conectar:     " -NoNewline; Write-ColorOutput "docker exec -it $mysqlContainer mysql -u$mysqlUser -p$mysqlPassword $mysqlDb" "White"

Write-ColorOutput "`n[OK] Docker configurado correctamente!" "Green"
