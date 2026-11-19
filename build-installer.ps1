# Builds release\Makifind-1.0.0-Setup.exe. Usage: .\build-installer.ps1 [-SkipBuild]
# Needs Inno Setup 6 (winget install JRSoftware.InnoSetup).
param([switch]$SkipBuild)
$ErrorActionPreference = "Stop"

if (-not $SkipBuild) {
    # Nothing to compile: the panel ships as plain HTML/JS.
}

$iscc = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) { throw "Inno Setup 6 not found. Install it: winget install JRSoftware.InnoSetup" }

& $iscc /Qp "$PSScriptRoot\installer\Makifind.iss"
if ($LASTEXITCODE -ne 0) { throw "Installer build failed." }
Write-Host "Built: $PSScriptRoot\release\Makifind-1.0.0-Setup.exe"
