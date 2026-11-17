param([int]$Port = 8012)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js diperlukan. Pasang Node.js lalu jalankan ulang script ini.'
}

Write-Host 'Menjalankan KDMP dalam mode demo lokal.' -ForegroundColor Cyan
Write-Host "Buka http://127.0.0.1:$Port pada browser. Tekan Ctrl+C untuk berhenti."
Write-Host 'Mode ini memakai backend simulasi dan tidak menulis ke Supabase.' -ForegroundColor Yellow
$env:KDMP_PORT = "$Port"
node tools/e2e-preview-server.js
