$ErrorActionPreference = 'Stop'

$workspace = 'C:\Users\diego\OneDrive\Desktop\Banco'
$py = 'C:/Users/diego/OneDrive/Desktop/Banco/.venv/Scripts/python.exe'

$mysqlContainer = 'banco-mysql'
$mysqlRootPassword = 'RootPass123!'
$mysqlDb = 'loan_system_db'
$mysqlUser = 'loan_user'
$mysqlPassword = 'TuContrasenaSegura123!'
$mysqlHost = '127.0.0.1'
$mysqlPort = '3307'

# Ensure MySQL Docker container exists and is running
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker no esta disponible. Abre Docker Desktop y reintenta.'
}

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

# Wait for MySQL to be ready
for ($i = 0; $i -lt 60; $i++) {
  docker exec -e "MYSQL_PWD=$mysqlRootPassword" $mysqlContainer mysqladmin ping -uroot --silent 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}

# Force the app user password (avoids auth/encoding surprises)
docker exec -e "MYSQL_PWD=$mysqlRootPassword" $mysqlContainer mysql -uroot -e "ALTER USER '$mysqlUser'@'%' IDENTIFIED BY '$mysqlPassword'; FLUSH PRIVILEGES;" 2>$null | Out-Null

# DB env (MySQL in Docker)
$env:MYSQL_NAME = $mysqlDb
$env:MYSQL_USER = $mysqlUser
$env:MYSQL_PASSWORD = $mysqlPassword
$env:MYSQL_HOST = $mysqlHost
$env:MYSQL_PORT = $mysqlPort

# Ensure seed data exists and capture IDs (idempotent)
Set-Location $workspace
$null = & $py loan_system/manage.py migrate 2>&1
$seedOut = & $py loan_system/manage.py seed_initial_data 2>&1
$clientId = ($seedOut | Select-String '^client_id=' | Select-Object -First 1).Line.Split('=')[1].Trim()
$instId = ($seedOut | Select-String '^installment_id=' | Select-Object -First 1).Line.Split('=')[1].Trim()
if (-not $clientId -or -not $instId) {
  throw "No pude leer client_id/installment_id desde seed_initial_data. Output: $($seedOut | Out-String)"
}

# Start server as a background job
Get-Job -Name banco-server -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue
Get-Job -Name banco-server -ErrorAction SilentlyContinue | Remove-Job -ErrorAction SilentlyContinue

$job = Start-Job -Name banco-server -ScriptBlock {
  $env:MYSQL_NAME = 'loan_system_db'
  $env:MYSQL_USER = 'loan_user'
  $env:MYSQL_PASSWORD = 'TuContrasenaSegura123!'
  $env:MYSQL_HOST = '127.0.0.1'
  $env:MYSQL_PORT = '3307'

  Set-Location 'C:\Users\diego\OneDrive\Desktop\Banco'
  C:/Users/diego/OneDrive/Desktop/Banco/.venv/Scripts/python.exe loan_system/manage.py runserver 127.0.0.1:8000
}

# Wait until TCP port is open
$base = 'http://127.0.0.1:8000'
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect('127.0.0.1', 8000)
    $tcp.Close()
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 1
  }
}
if (-not $ready) {
  Stop-Job -Name banco-server -ErrorAction SilentlyContinue
  Remove-Job -Name banco-server -ErrorAction SilentlyContinue
  throw 'Servidor no respondio a tiempo'
}

function PostJson([string]$url, $body, $headers = @{}) {
  Invoke-RestMethod -Uri $url -Method POST -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 10) -Headers $headers
}

# Tokens
$adminTok = PostJson "$base/api/auth/token/" @{ username = 'admin'; password = 'admin1234' }
$clientTok = PostJson "$base/api/auth/token/" @{ username = 'client1'; password = 'client1234' }

$adminHeaders = @{ Authorization = "Bearer $($adminTok.access)" }
$clientHeaders = @{ Authorization = "Bearer $($clientTok.access)" }

# Quote
$quote = PostJson "$base/api/loans/quote/" @{ principal_amount = '1000.00'; currency = 'USD'; monthly_rate = '0.020000'; term_months = 12 } $adminHeaders

# Create loan (then reject it)
$newLoan = PostJson "$base/api/loans/" @{ client_id = $clientId; principal_amount = '500.00'; currency = 'USD'; monthly_rate = '0.020000'; term_months = 6 } $adminHeaders
$decision = PostJson "$base/api/loans/$($newLoan.loan_id)/decision/" @{ approve = $false; reason = 'seed-e2e' } $adminHeaders

# Payment + duplicate
$ref = 'REF-' + ([guid]::NewGuid().ToString('N').Substring(0, 8))
$pay1 = PostJson "$base/api/payments/" @{ installment_id = $instId; reference = $ref; amount = '100.00'; currency = 'USD' } $clientHeaders

$dupStatus = $null
try {
  $null = PostJson "$base/api/payments/" @{ installment_id = $instId; reference = $ref; amount = '100.00'; currency = 'USD' } $clientHeaders
  $dupStatus = 200
} catch {
  try { $dupStatus = $_.Exception.Response.StatusCode.value__ } catch { $dupStatus = 'unknown' }
}

# Print summary
'JWT(admin)=OK'
'JWT(client)=OK'
('Quote.monthly_payment=' + $quote.monthly_payment)
('Loan.create.loan_id=' + $newLoan.loan_id)
('Loan.decision.reject=' + $decision.status)
('Payment.id=' + $pay1.payment_id)
('Payment.duplicate.http_status=' + $dupStatus)

# Stop server job
Stop-Job -Name banco-server -ErrorAction SilentlyContinue
Remove-Job -Name banco-server -ErrorAction SilentlyContinue
