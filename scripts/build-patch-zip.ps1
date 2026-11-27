param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [string]$UnpackedResourcesDir = "D:\evrakplus-build\stage\dist\windows\win-unpacked\resources",
  [string]$OutDir = "",
  [string]$ElectronVersion = "34.5.8"
)

$ErrorActionPreference = "Stop"

if (-not $OutDir) {
  $OutDir = "D:\evrakplus-build\release-$Version"
}

$asarPath = Join-Path $UnpackedResourcesDir "app.asar"
$uiPublicDir = Join-Path $UnpackedResourcesDir "ui-shared\public"

if (-not (Test-Path $asarPath)) {
  throw "app.asar bulunamadi: $asarPath"
}
if (-not (Test-Path (Join-Path $uiPublicDir "index.html"))) {
  throw "ui-shared/public/index.html bulunamadi: $uiPublicDir"
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$stageDir = Join-Path $env:TEMP ("dersmatrix-patch-stage-$Version-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
$zipPath = Join-Path $OutDir "DersMatrix-Patch-$Version.zip"

try {
  New-Item -ItemType Directory -Path (Join-Path $stageDir "ui-shared\public") -Force | Out-Null

  # Electron'un .asar sanal dosya sistemi cakismasini onlemek icin yama icinde app.asar.bin olarak saklanir
  Copy-Item -Path $asarPath -Destination (Join-Path $stageDir "app.asar.bin") -Force
  Copy-Item -Path (Join-Path $uiPublicDir "*") -Destination (Join-Path $stageDir "ui-shared\public") -Recurse -Force

  $manifest = [ordered]@{
    version               = $Version
    minElectron           = $ElectronVersion
    requiresFullInstaller = $false
    createdAt             = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  } | ConvertTo-Json -Depth 4
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path $stageDir "manifest.json"), $manifest, $utf8NoBom)

  if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
  }

  # Standart Deflate ZIP (System.IO.Compression) — extractZipSafe ile %100 uyumlu
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stageDir,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
  )

  $item = Get-Item $zipPath
  $sha = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $mb = [math]::Round($item.Length / 1MB, 2)
  Write-Host "[OK] Mini yama paketi olusturuldu: $zipPath ($mb MB | $($item.Length) bayt)"
  Write-Host "[SHA256] $sha  $($item.Name)"
} finally {
  if (Test-Path $stageDir) {
    Remove-Item -Path $stageDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
