# Uruchamia serwer gry i tunel jedną komendą.
#
#   .\start.ps1                      tunel losowy (trycloudflare)
#   .\start.ps1 -Named raidfolk      nazwany tunel Cloudflare (wymaga domeny)
#   .\start.ps1 -Ngrok raidfolk.ngrok-free.app
#   .\start.ps1 -NoTunnel            tylko serwer, sieć lokalna
#
# Ctrl+C zamyka oba.

param(
  [string]$Named,
  [string]$Ngrok,
  [switch]$NoTunnel,
  [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

# --- posprzątaj po poprzednim uruchomieniu ---
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process cloudflared, ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 400

# --- serwer ---
$env:PORT = $Port
$server = Start-Process node -ArgumentList 'server.js' -WorkingDirectory $root -PassThru -WindowStyle Hidden
Start-Sleep -Milliseconds 1200

try { Invoke-WebRequest "http://127.0.0.1:$Port/api/classes" -UseBasicParsing -TimeoutSec 5 | Out-Null }
catch { Write-Host "Serwer nie wstal. Sprawdz: node server.js" -ForegroundColor Red; exit 1 }

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
       Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "  SERWER      http://${ip}:$Port" -ForegroundColor Green

# --- tunel ---
$tunnel = $null
if (-not $NoTunnel) {
  $cf = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
  if (-not (Test-Path $cf)) { $cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source }

  # ngrok z wingeta nie trafia od razu do PATH biezacej konsoli
  $ng = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
  if (-not $ng) {
    $ng = (Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet" -Recurse -Filter ngrok.exe -ErrorAction SilentlyContinue |
           Select-Object -First 1).FullName
  }

  if ($Ngrok) {
    if (-not $ng) { Write-Host "  Nie znalazlem ngrok.exe" -ForegroundColor Red; exit 1 }
    $tunnel = Start-Process $ng -ArgumentList "http","--url=$Ngrok","$Port" -PassThru -WindowStyle Hidden
    Write-Host "  PUBLICZNY   https://$Ngrok" -ForegroundColor Green
  }
  elseif ($Named) {
    $tunnel = Start-Process $cf -ArgumentList "tunnel","run",$Named -PassThru -WindowStyle Hidden
    Write-Host "  PUBLICZNY   tunel '$Named' (adres wg Twojej konfiguracji DNS)" -ForegroundColor Green
  }
  elseif ($cf) {
    $log = Join-Path $root 'tunnel.log'
    Remove-Item $log -ErrorAction SilentlyContinue
    $tunnel = Start-Process $cf -ArgumentList "tunnel","--url","http://localhost:$Port","--no-autoupdate","--logfile",$log -PassThru -WindowStyle Hidden

    $url = $null
    for ($i = 0; $i -lt 30 -and -not $url; $i++) {
      Start-Sleep -Seconds 1
      if (Test-Path $log) {
        $url = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches |
               ForEach-Object { $_.Matches.Value } | Select-Object -Unique -First 1
      }
    }
    if ($url) {
      Write-Host "  PUBLICZNY   $url" -ForegroundColor Green
      Write-Host "  UWAGA       adres losowy — zmieni sie po restarcie" -ForegroundColor DarkYellow
    } else {
      Write-Host "  TUNEL       nie wstal, sprawdz tunnel.log" -ForegroundColor Red
    }
  }
}

Write-Host ""
Write-Host "  Ctrl+C konczy oba procesy."
Write-Host ""

try { Wait-Process -Id $server.Id }
finally {
  foreach ($p in @($server, $tunnel)) {
    if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
  }
  Write-Host "zatrzymane."
}
