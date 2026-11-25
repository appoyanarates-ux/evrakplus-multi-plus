# EvrakPlus Ders Dagitim Multi Plus v1.0.0 — Final Release Paketleme Betigi
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ver = "2.0.0"
$outDir = Join-Path $root "dist\release"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "=== 1. HTML Preview (Tek Dosya) uretiliyor ==="
$uiDir = Join-Path $root "packages\ui-shared\public"
$htmlTpl = Get-Content (Join-Path $uiDir "index.html") -Raw -Encoding UTF8
$cssSrc = Get-Content (Join-Path $uiDir "styles.css") -Raw -Encoding UTF8
$jsFiles = @("meb-data.js", "solver-bridge.js", "reports-doc.js", "app.js")
$jsBundle = ($jsFiles | ForEach-Object { Get-Content (Join-Path $uiDir $_) -Raw -Encoding UTF8 }) -join "`n"
$previewHtml = $htmlTpl.Replace('<link rel="stylesheet" href="./styles.css">', "<style>`n$cssSrc`n</style>")
$previewHtml = [regex]::Replace($previewHtml, '<script src="\./meb-data\.js"></script>\s*<script src="\./solver-bridge\.js"></script>\s*<script src="\./reports-doc\.js"></script>\s*<script src="\./app\.js"></script>', { param($m) "<script>`n$jsBundle`n</script>" })
Set-Content -Path (Join-Path $outDir "EvrakPlus-Multi-Plus-$ver-HTML-Preview.html") -Value $previewHtml -Encoding UTF8

Write-Host "=== 2. cPanel Web ZIP uretiliyor ==="
$cpanelZip = Join-Path $outDir "EvrakPlus-Multi-Plus-$ver-cPanel.zip"
if (Test-Path $cpanelZip) { Remove-Item -Force $cpanelZip }
Compress-Archive -Path (Join-Path $root "apps\web-php-cpanel\*") -DestinationPath $cpanelZip -CompressionLevel Optimal

Write-Host "=== 3. WordPress Connect Eklentisi ZIP uretiliyor ==="
$wpZip = Join-Path $outDir "EvrakPlus-Multi-Plus-Connect-$ver.zip"
if (Test-Path $wpZip) { Remove-Item -Force $wpZip }
Compress-Archive -Path (Join-Path $root "apps\wp-connect-plugin\evrakplus-multi-plus-connect") -DestinationPath $wpZip -CompressionLevel Optimal

Write-Host "=== 4. Linux Solver Server ZIP uretiliyor ==="
$srvTmp = Join-Path $root ".tools\pkg_solver_server"
if (Test-Path $srvTmp) { Remove-Item -Recurse -Force $srvTmp }
New-Item -ItemType Directory -Force -Path "$srvTmp\apps\solver-server", "$srvTmp\engines", "$srvTmp\resources\engines\timefold", "$srvTmp\resources\engines\choco" | Out-Null
Copy-Item -Recurse -Force (Join-Path $root "apps\solver-server\*") "$srvTmp\apps\solver-server\"
Copy-Item -Recurse -Force (Join-Path $root "engines\ortools"), (Join-Path $root "engines\scip"), (Join-Path $root "engines\highs"), (Join-Path $root "engines\minizinc") "$srvTmp\engines\"
if (Test-Path (Join-Path $root "resources\engines\timefold\evrakplus-timefold.jar")) {
  Copy-Item -Force (Join-Path $root "resources\engines\timefold\evrakplus-timefold.jar") "$srvTmp\resources\engines\timefold\"
}
if (Test-Path (Join-Path $root "resources\engines\choco\evrakplus-choco.jar")) {
  Copy-Item -Force (Join-Path $root "resources\engines\choco\evrakplus-choco.jar") "$srvTmp\resources\engines\choco\"
}
$srvZip = Join-Path $outDir "EvrakPlus-Multi-Plus-$ver-Solver-Server.zip"
if (Test-Path $srvZip) { Remove-Item -Force $srvZip }
Compress-Archive -Path "$srvTmp\*" -DestinationPath $srvZip -CompressionLevel Optimal
Remove-Item -Recurse -Force $srvTmp

Write-Host "=== 5. Kaynak Kod ZIP (git archive) uretiliyor ==="
$srcZip = Join-Path $outDir "EvrakPlus-Multi-Plus-$ver-Source.zip"
if (Test-Path $srcZip) { Remove-Item -Force $srcZip }
Push-Location $root
git archive --format=zip --output=$srcZip HEAD
Pop-Location

Write-Host "=== 6. Dokumantasyon dosyalari kopyalaniyor ==="
Copy-Item -Force (Join-Path $root "docs\EvrakPlus-Multi-Plus-$ver-Test-Report.md") (Join-Path $outDir "EvrakPlus-Multi-Plus-$ver-Test-Report.md")
Copy-Item -Force (Join-Path $root "docs\EvrakPlus-Multi-Plus-$ver-Installation.md") (Join-Path $outDir "EvrakPlus-Multi-Plus-$ver-Installation.md")
Copy-Item -Force (Join-Path $root "docs\CHANGELOG.md") (Join-Path $outDir "EvrakPlus-Multi-Plus-$ver-CHANGELOG.md")

Write-Host "=== 7. Windows EXE paketleri (varsa) tasiniyor ==="
$winDist = Join-Path $root "dist\windows"
if (Test-Path $winDist) {
  Get-ChildItem $winDist -Filter "EvrakPlus-Multi-Plus-$ver-*.exe" | ForEach-Object {
    Copy-Item -Force $_.FullName (Join-Path $outDir $_.Name)
  }
}

Write-Host "=== 8. SHA256SUMS.txt hesaplaniyor ==="
$sumFile = Join-Path $outDir "SHA256SUMS.txt"
$lines = @()
Get-ChildItem $outDir -File | Where-Object { $_.Name -ne "SHA256SUMS.txt" } | Sort-Object Name | ForEach-Object {
  $h = (Get-FileHash -Algorithm SHA256 -Path $_.FullName).Hash.ToLower()
  $lines += "$h  $($_.Name)"
}
Set-Content -Path $sumFile -Value ($lines -join "`n") -Encoding ASCII

Write-Host "`n=== TESLIM DOSYALARI ($outDir) ==="
Get-ChildItem $outDir -File | Sort-Object Name | Format-Table Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}} -AutoSize
