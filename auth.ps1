# Zapisuje token ngrok, nie przejmujac sie tym, czy ngrok jest na PATH.
#
#   .\auth.ps1 TWOJ_TOKEN

param([Parameter(Mandatory = $true)][string]$Token)

$ng = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $ng) {
  $ng = (Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet" -Recurse -Filter ngrok.exe -ErrorAction SilentlyContinue |
         Select-Object -First 1).FullName
}
if (-not $ng) {
  Write-Host "Nie znalazlem ngrok.exe. Zainstaluj: winget install ngrok.ngrok" -ForegroundColor Red
  exit 1
}

Write-Host "ngrok: $ng" -ForegroundColor DarkGray
& $ng config add-authtoken $Token
if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "  Token zapisany." -ForegroundColor Green
  Write-Host "  Teraz: .\start.ps1 -Ngrok twoj-adres.ngrok-free.app"
}
