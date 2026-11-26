<#
.SYNOPSIS
  6 gomulu optimizasyon motorunun TAMAMINI koruyarak Java (jlink minimal JRE) ve Python
  calisma ortamlarindaki kullanilmayan gelistirici/test/onbellek dosyalarini temizler.
.EXAMPLE
  .\scripts\optimize-embedded-runtimes.ps1 -RuntimeDir "D:\evrakplus-build\stage\resources\runtime" -BackupDir "D:\evrakplus-build\runtime-backup"
#>
param(
  [string]$RuntimeDir = 'D:\evrakplus-build\stage\resources\runtime',
  [string]$BackupDir = 'D:\evrakplus-build\runtime-backup-full'
)

$ErrorActionPreference = 'Stop'

function Get-DirSizeMB([string]$Path) {
  if (-not (Test-Path $Path)) { return 0 }
  $sum = (Get-ChildItem $Path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  return [math]::Round(($sum / 1MB), 1)
}

$javaDir = Join-Path $RuntimeDir 'java'
$pyDir = Join-Path $RuntimeDir 'python'

$javaBefore = Get-DirSizeMB $javaDir
$pyBefore = Get-DirSizeMB $pyDir
Write-Host "Baslangic boyutlari -> Java: $javaBefore MB | Python: $pyBefore MB | Toplam: $([math]::Round($javaBefore + $pyBefore, 1)) MB"

# 1. Java: Tam JDK varsa yedekle ve jlink ile minimal JRE uret (Timefold + Choco icin tam uyumlu)
$jlinkExe = Join-Path $javaDir 'bin\jlink.exe'
if (Test-Path $jlinkExe) {
  $javaBackup = Join-Path $BackupDir 'java-full-jdk'
  if (-not (Test-Path $javaBackup)) {
    Write-Host "[JAVA] Tam JDK yedekleniyor -> $javaBackup"
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Copy-Item $javaDir $javaBackup -Recurse -Force
  }
  $minimalOut = Join-Path $BackupDir 'java-minimal-tmp'
  if (Test-Path $minimalOut) { Remove-Item $minimalOut -Recurse -Force }

  $modules = 'java.base,java.compiler,java.desktop,java.instrument,java.logging,java.management,java.naming,java.net.http,java.sql,java.xml,jdk.management,jdk.unsupported'
  Write-Host "[JAVA] jlink minimal JRE uretiliyor ($modules)..."
  & (Join-Path $javaBackup 'bin\jlink.exe') `
    --add-modules $modules `
    --strip-debug `
    --no-man-pages `
    --no-header-files `
    --compress=zip-6 `
    --output $minimalOut
  if ($LASTEXITCODE -ne 0) { throw "jlink basarisiz oldu (kod: $LASTEXITCODE)" }

  Remove-Item $javaDir -Recurse -Force
  Move-Item $minimalOut $javaDir
  Write-Host "[JAVA] Minimal JRE hazir: $javaBefore MB -> $(Get-DirSizeMB $javaDir) MB"
} else {
  Write-Host "[JAVA] Zaten minimal JRE (jlink.exe yok), atlaniyor ($javaBefore MB)."
}

# 2. Python: Yalnizca guvenli onbellek/test/kullanilmayan gelistirici artiklarini temizle
if (Test-Path $pyDir) {
  Write-Host "[PYTHON] __pycache__, test dizinleri, pip ve kullanilmayan pandas artiklari temizleniyor..."
  Get-ChildItem $pyDir -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Get-ChildItem (Join-Path $pyDir 'Lib') -Recurse -Directory -Include 'test','tests','testing' -ErrorAction SilentlyContinue | ForEach-Object {
    # numpy/ortools cekirdek modullerinde import edilen kucuk helper'lar haric test paketlerini sil
    if ($_.FullName -notmatch '\\numpy\\_core\\' -and $_.FullName -notmatch '\\ortools\\sat\\') {
      Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
  $unusedPkgs = @('pip', 'pip-*')
  $sp = Join-Path $pyDir 'Lib\site-packages'
  foreach ($pat in $unusedPkgs) {
    Get-ChildItem $sp -Filter $pat -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  }
  $incDir = Join-Path $pyDir 'include'
  if (Test-Path $incDir) { Remove-Item $incDir -Recurse -Force -ErrorAction SilentlyContinue }
  Write-Host "[PYTHON] Temizlik tamamlandi: $pyBefore MB -> $(Get-DirSizeMB $pyDir) MB"
}

$javaAfter = Get-DirSizeMB $javaDir
$pyAfter = Get-DirSizeMB $pyDir
$saved = [math]::Round(($javaBefore + $pyBefore) - ($javaAfter + $pyAfter), 1)
Write-Host "SONUC -> Java: $javaAfter MB | Python: $pyAfter MB | Toplam tasarruf: $saved MB"
