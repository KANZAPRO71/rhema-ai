# Build AAB release untuk Google Play Store — Rhema AI
# Usage:
#   .\scripts\build-play-release.ps1
#   $env:RHEMA_KEYSTORE_PASS='...'; $env:RHEMA_KEY_PASS='...'; .\scripts\build-play-release.ps1 -CreateKeystore

param(
    [switch]$CreateKeystore,
    [switch]$SkipCapCopy
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Android = Join-Path $Root "android"
$ReleaseDir = Join-Path $Root "release"
$KeystoreFile = Join-Path $ReleaseDir "rhema-release.keystore"
$PropsFile = Join-Path $Android "keystore.properties"
$PropsExample = Join-Path $Android "keystore.properties.example"
$AabOut = Join-Path $Android "app\build\outputs\bundle\release\app-release.aab"

Set-Location $Root
Write-Host "== Rhema AI — Play Store release build ==" -ForegroundColor Cyan

if (-not $SkipCapCopy) {
    Write-Host ">> cap copy android ..."
    npx cap copy android
}

if (-not (Test-Path $PropsFile)) {
    if ($CreateKeystore) {
        $storePass = $env:RHEMA_KEYSTORE_PASS
        $keyPass = $env:RHEMA_KEY_PASS
        if (-not $storePass -or -not $keyPass) {
            Write-Host "ERROR: Set env RHEMA_KEYSTORE_PASS dan RHEMA_KEY_PASS sebelum -CreateKeystore" -ForegroundColor Red
            exit 1
        }
        New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
        if (-not (Test-Path $KeystoreFile)) {
            Write-Host ">> Membuat upload keystore: $KeystoreFile"
            $keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
            if (-not (Test-Path $keytool)) { $keytool = "keytool" }
            & $keytool -genkeypair -v `
                -keystore $KeystoreFile `
                -alias rhema-release `
                -keyalg RSA -keysize 2048 -validity 10000 `
                -storepass $storePass -keypass $keyPass `
                -dname "CN=Rhema AI, OU=Mobile, O=Rhema, L=Jakarta, ST=DKI, C=ID"
        }
        @"
storeFile=../release/rhema-release.keystore
storePassword=$storePass
keyAlias=rhema-release
keyPassword=$keyPass
"@ | Set-Content -Path $PropsFile -Encoding UTF8
        Write-Host ">> keystore.properties dibuat (tidak di-commit — sudah di .gitignore)" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "PERINGATAN: android/keystore.properties belum ada." -ForegroundColor Yellow
        Write-Host "  1. Salin: android/keystore.properties.example -> android/keystore.properties"
        Write-Host "  2. Atau jalankan:"
        Write-Host '     $env:RHEMA_KEYSTORE_PASS="..."; $env:RHEMA_KEY_PASS="..."; .\scripts\build-play-release.ps1 -CreateKeystore'
        Write-Host ""
        Write-Host "Build release unsigned tetap dilanjutkan (Play Console butuh signed AAB)." -ForegroundColor Yellow
    }
}

Set-Location $Android
Write-Host ">> gradlew bundleRelease (targetSdk 36) ..."
.\gradlew bundleRelease --no-daemon

if (Test-Path $AabOut) {
    $size = [math]::Round((Get-Item $AabOut).Length / 1MB, 2)
    Write-Host ""
    Write-Host "SUKSES: $AabOut ($size MB)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Play Console checklist:" -ForegroundColor Cyan
    Write-Host "  • Upload AAB di Release > Production / Internal testing"
    Write-Host "  • Privacy policy URL: host www/privacy.html (ganti YOUR_DOMAIN di file tersebut)"
    Write-Host "  • Update PRIVACY_POLICY_PUBLIC_URL di www/legalUrls.js"
    Write-Host "  • Isi Data Safety: mic, user-provided API key, app activity (local)"
    Write-Host "  • Deklarasi izin RECORD_AUDIO"
} else {
    Write-Host "ERROR: AAB tidak ditemukan." -ForegroundColor Red
    exit 1
}
