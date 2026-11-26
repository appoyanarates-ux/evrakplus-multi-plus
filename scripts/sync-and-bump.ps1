<#
.SYNOPSIS
  DersMatrix Ultimate tek komutlu Web/cPanel senkronizasyon, surum guncelleme ve dogrulama scripti.
.EXAMPLE
  .\scripts\sync-and-bump.ps1 -SyncOnly
  .\scripts\sync-and-bump.ps1 -Version "2.5.0"
#>
param(
  [string]$Version = '',
  [switch]$SyncOnly,
  [switch]$SkipCheck
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Replace-InFile {
  param([string]$RelPath, [string]$Pattern, [string]$Replacement)
  $full = Join-Path $repoRoot $RelPath
  if (-not (Test-Path $full)) { throw "Dosya bulunamadi: $RelPath" }
  $raw = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)
  $next = [System.Text.RegularExpressions.Regex]::Replace($raw, $Pattern, $Replacement)
  if ($next -eq $raw) {
    Write-Warning "Degisiklik uygulanmadi (eslesme yok): $RelPath"
  } else {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($full, $next, $utf8NoBom)
    Write-Host "[BUMP] $RelPath -> $Version"
  }
}

if ($Version -and (-not $SyncOnly)) {
  if ($Version -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$') {
    throw "Gecersiz SemVer surumu: $Version"
  }
  Replace-InFile 'package.json' '"version":\s*"[^"]+"' "`"version`": `"$Version`""
  Replace-InFile 'apps\desktop-electron\package.json' '"version":\s*"[^"]+"' "`"version`": `"$Version`""
  Replace-InFile 'apps\desktop-electron\src\main.js' "export const APP_VERSION = '[^']+'" "export const APP_VERSION = '$Version'"
  Replace-InFile 'apps\desktop-electron\src\preload.cjs' "appVersion:\s*'[^']+'" "appVersion: '$Version'"
  Replace-InFile 'packages\ui-shared\public\app.js' "const APP_VER = \(bridge && bridge\.appVersion\) \|\| '[^']+'" "const APP_VER = (bridge && bridge.appVersion) || '$Version'"
  Replace-InFile 'packages\ui-shared\public\solver-bridge.js' "appVersion:\s*'[^']+'" "appVersion: '$Version'"
  Replace-InFile 'packages\ui-shared\public\index.html' 'DersMatrix Ultimate · v[0-9A-Za-z.-]+' "DersMatrix Ultimate · v$Version"
  Replace-InFile 'packages\ui-shared\public\index.html' '<small>v[0-9A-Za-z.-]+ · by EvrakPlus</small>' "<small>v$Version · by EvrakPlus</small>"
  Replace-InFile 'apps\web-php-cpanel\assets\ui-body.html' '<small>v[0-9A-Za-z.-]+ · by EvrakPlus</small>' "<small>v$Version · by EvrakPlus</small>"
  Replace-InFile 'apps\web-php-cpanel\index.php' 'DersMatrix Ultimate · v[0-9A-Za-z.-]+ Web' "DersMatrix Ultimate · v$Version Web"
  Replace-InFile 'apps\wp-connect-plugin\evrakplus-multi-plus-connect\evrakplus-multi-plus-connect.php' '\*\s*Version:\s*[0-9A-Za-z.-]+' "* Version: $Version"
  Replace-InFile 'apps\wp-connect-plugin\evrakplus-multi-plus-connect\evrakplus-multi-plus-connect.php' "define\('EP_MP_VERSION',\s*'[^']+'\)" "define('EP_MP_VERSION', '$Version')"
}

$jsDir = Join-Path $repoRoot 'apps\web-php-cpanel\assets\js'
$cssDir = Join-Path $repoRoot 'apps\web-php-cpanel\assets\css'
New-Item -ItemType Directory -Path $jsDir -Force | Out-Null
New-Item -ItemType Directory -Path $cssDir -Force | Out-Null

Copy-Item (Join-Path $repoRoot 'packages\ui-shared\public\*.js') $jsDir -Force
Copy-Item (Join-Path $repoRoot 'packages\ui-shared\public\styles.css') (Join-Path $cssDir 'styles.css') -Force
Write-Host "[SYNC] packages/ui-shared/public -> apps/web-php-cpanel/assets/{js,css}"

$stray = Get-ChildItem (Join-Path $repoRoot 'apps\web-php-cpanel\assets') -File | Where-Object { $_.Extension -in '.js', '.css' }
if ($stray) {
  throw "Hata: apps/web-php-cpanel/assets kokunde yanlis yerlestirilmis dosyalar bulundu: $($stray.Name -join ', ')"
}

if (-not $SkipCheck) {
  $checkFiles = @(
    'apps\desktop-electron\src\main.js',
    'apps\desktop-electron\src\sqlite-store.js',
    'apps\desktop-electron\src\preload.cjs',
    'packages\ui-shared\public\meb-data.js',
    'packages\ui-shared\public\solver-bridge.js',
    'packages\ui-shared\public\reports-doc.js',
    'packages\ui-shared\public\app.js'
  )
  foreach ($cf in $checkFiles) {
    & node --check (Join-Path $repoRoot $cf)
    if ($LASTEXITCODE -ne 0) { throw "Syntax hatasi: $cf" }
  }
  Write-Host "[CHECK] Tum JS dosyalari syntax kontrolunden gecti."
}
