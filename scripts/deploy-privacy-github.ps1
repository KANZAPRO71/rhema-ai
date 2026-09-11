# Deploy www/privacy.html ke GitHub Pages (repo public: rhema-ai-privacy)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LegalDir = Join-Path $Root "legal-site"
$Src = Join-Path $Root "www\privacy.html"

New-Item -ItemType Directory -Force -Path $LegalDir | Out-Null
Copy-Item -Force $Src (Join-Path $LegalDir "index.html")
Copy-Item -Force $Src (Join-Path $LegalDir "privacy.html")

Set-Location $LegalDir
if (-not (Test-Path ".git")) {
    git init -b main
    git add index.html privacy.html
    git commit -m "Privacy policy Rhema AI for Play Store"
    gh repo create rhema-ai-privacy --public --source=. --remote=origin --push --description "Rhema AI Privacy Policy"
    gh api repos/KANZAPRO71/rhema-ai-privacy/pages -X POST -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/" 2>$null
} else {
    git add index.html privacy.html
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m "Update privacy policy"
        git push origin main
    } else {
        Write-Host "No privacy policy changes."
    }
}

Write-Host ""
Write-Host "Privacy policy URL:" -ForegroundColor Green
Write-Host "  https://kanzapro71.github.io/rhema-ai-privacy/"
Write-Host "Wait 1-3 minutes after first deploy for GitHub Pages."
