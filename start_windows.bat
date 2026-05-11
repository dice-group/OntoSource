@echo off
setlocal
set "ONTO_BAT=%~f0"
set "ONTO_ROOT=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$content = Get-Content -Raw -LiteralPath $env:ONTO_BAT; $script = [regex]::Split($content, '(?m)^# POWERSHELL_START\r?$', 2)[1]; Invoke-Expression $script"
exit /b %ERRORLEVEL%

# POWERSHELL_START
$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $env:ONTO_ROOT

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Stop-ProcessTree {
    param([System.Diagnostics.Process]$Process)

    if ($null -eq $Process) {
        return
    }

    $Process.Refresh()
    if (-not $Process.HasExited) {
        taskkill.exe /PID $Process.Id /T /F 2>$null | Out-Null
    }
}

function Wait-ForUrl {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Attempts
    )

    Write-Host "Waiting for $Name" -NoNewline -ForegroundColor Cyan
    for ($i = 1; $i -le $Attempts; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
            Write-Host ""
            Write-Host "[OK] $Name ready at $Url" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "." -NoNewline -ForegroundColor Cyan
        }
    }

    Write-Host ""
    Write-Host "[WARN] $Name did not become ready at $Url before the timeout." -ForegroundColor Yellow
    return $false
}

Write-Host "Starting OntoSource..." -ForegroundColor Green

if (-not (Test-Command "uv")) {
    Write-Host "ERROR: uv is not installed or not on PATH." -ForegroundColor Red
    Write-Host "Install it with: winget install --id=astral-sh.uv -e" -ForegroundColor Yellow
    Write-Host "Or see: https://docs.astral.sh/uv/getting-started/installation/" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Command "ant")) {
    Write-Host "ERROR: Apache Ant is required to build jpype1, which is used by owlapy." -ForegroundColor Red
    Write-Host "Install Apache Ant and make sure ant is on PATH." -ForegroundColor Yellow
    Write-Host "For example, with Chocolatey: choco install ant" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "ERROR: npm is not installed or not on PATH." -ForegroundColor Red
    Write-Host "Install Node.js 18+ from https://nodejs.org/." -ForegroundColor Yellow
    exit 1
}

$uvLog = Join-Path $env:TEMP "ontosource_uv_sync.log"
Write-Host "Syncing Python dependencies with uv..." -ForegroundColor Green
& uv sync *> $uvLog
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: uv sync failed. Log:" -ForegroundColor Red
    Get-Content -LiteralPath $uvLog
    exit $LASTEXITCODE
}
Write-Host "[OK] Python dependencies synced" -ForegroundColor Green

$nodeModules = Join-Path (Join-Path (Get-Location) "webapp") "node_modules"
if (-not (Test-Path -LiteralPath $nodeModules -PathType Container)) {
    $npmLog = Join-Path $env:TEMP "ontosource_npm_install.log"
    Write-Host "Node modules not found. Installing..." -ForegroundColor Yellow
    & npm install --prefix webapp *> $npmLog
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed. Log:" -ForegroundColor Red
        Get-Content -LiteralPath $npmLog
        exit $LASTEXITCODE
    }
    Write-Host "[OK] Node dependencies installed" -ForegroundColor Green
}

$backend = $null
$frontend = $null

try {
    Write-Host "Starting FastAPI backend..." -ForegroundColor Green
    $backend = Start-Process `
        -FilePath "uv" `
        -ArgumentList @("run", "uvicorn", "main:app", "--reload") `
        -WorkingDirectory (Join-Path (Get-Location) "services") `
        -NoNewWindow `
        -PassThru

    Wait-ForUrl -Name "Backend" -Url "http://localhost:8000/docs" -Attempts 40 | Out-Null

    Write-Host "Starting Next.js frontend..." -ForegroundColor Green
    $frontend = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @("run", "dev") `
        -WorkingDirectory (Join-Path (Get-Location) "webapp") `
        -NoNewWindow `
        -PassThru

    Wait-ForUrl -Name "Frontend" -Url "http://localhost:3000" -Attempts 60 | Out-Null

    Write-Host ""
    Write-Host "OntoSource is running!" -ForegroundColor Green
    Write-Host "  Backend:  http://localhost:8000"
    Write-Host "  Frontend: http://localhost:3000"
    Write-Host "  API docs: http://localhost:8000/docs"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
    Write-Host ""

    while ($true) {
        Start-Sleep -Seconds 1
        $backend.Refresh()
        $frontend.Refresh()

        if ($backend.HasExited) {
            throw "Backend process exited with code $($backend.ExitCode)."
        }

        if ($frontend.HasExited) {
            throw "Frontend process exited with code $($frontend.ExitCode)."
        }
    }
}
finally {
    Write-Host ""
    Write-Host "Shutting down services..." -ForegroundColor Yellow
    Stop-ProcessTree -Process $backend
    Stop-ProcessTree -Process $frontend
    Write-Host "Services stopped." -ForegroundColor Green
}
