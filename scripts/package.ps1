# Tianum Networth Managers - Netlify Deployment Packager
param (
    [string]$OutZip = "netlify-deploy.zip"
)

$ErrorActionPreference = "Stop"
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $rootDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Tianum Networth - Creating Netlify Deployable Package" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "[1/4] Running production build validation & HTML pre-rendering..." -ForegroundColor Yellow
node scripts/build.js
if ($LASTEXITCODE -ne 0) {
    throw "Production build validation failed!"
}

Write-Host "[2/4] Verifying production assets in dist/ assembled by build script..." -ForegroundColor Yellow
$stagingDir = Join-Path $rootDir "dist"
if (-not (Test-Path $stagingDir)) {
    throw "dist directory was not created by scripts/build.js!"
}

Write-Host "[3/4] Validating staging bundle integrity..." -ForegroundColor Yellow
$requiredFiles = @("index.html", "about.html", "contact.html", "404.html", "_redirects", "_headers", "netlify.toml")
foreach ($req in $requiredFiles) {
    $chk = Join-Path $stagingDir $req
    if (-not (Test-Path $chk)) {
        throw "Missing required deployment file: $req"
    }
}
Write-Host "  -> All critical deployment files verified at root." -ForegroundColor Green

# 3. Create ZIP archive
$zipPath = Join-Path $rootDir $OutZip
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

Write-Host "[4/4] Compressing deployment package into $OutZip..." -ForegroundColor Yellow
Compress-Archive -Path "$stagingDir\*" -DestinationPath $zipPath -CompressionLevel Optimal -Force

# Also create tianum-netlify-deploy.zip as an alias
$aliasZip = Join-Path $rootDir "tianum-netlify-deploy.zip"
Copy-Item -Path $zipPath -Destination $aliasZip -Force

$zipInfo = Get-Item $zipPath
$zipSizeMB = [math]::Round($zipInfo.Length / 1MB, 2)
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Netlify Deployable Package Created:" -ForegroundColor Green
Write-Host "  File: $OutZip ($zipSizeMB MB)" -ForegroundColor Cyan
Write-Host "  Alias: tianum-netlify-deploy.zip" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
