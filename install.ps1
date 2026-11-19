# Installs the Makifind panel for the current user (no admin needed).
# Links %APPDATA%\Adobe\CEP\extensions\FXConsole to this folder and enables unsigned CEP extensions.
$ErrorActionPreference = "Stop"

$extDir = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$target = Join-Path $extDir "Makifind"
New-Item -ItemType Directory -Force $extDir | Out-Null

if (Test-Path $target) {
    $item = Get-Item $target -Force
    if ($item.LinkType -eq "Junction") { $item.Delete() }
    else { throw "$target already exists and is not a link - remove it manually first." }
}
New-Item -ItemType Junction -Path $target -Target $PSScriptRoot | Out-Null
Write-Host "Linked $target -> $PSScriptRoot"

foreach ($v in 11, 12, 13) {
    $key = "HKCU:\Software\Adobe\CSXS.$v"
    New-Item -Path $key -Force | Out-Null
    Set-ItemProperty -Path $key -Name PlayerDebugMode -Value "1" -Type String
}
Write-Host "PlayerDebugMode=1 set for CSXS.11-13"
Write-Host "Restart After Effects, then open Window > Extensions > Makifind."
