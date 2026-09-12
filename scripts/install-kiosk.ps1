# RestoHub kiosk installer — registers the app to start automatically with
# Windows. Run:  powershell -ExecutionPolicy Bypass -File scripts\install-kiosk.ps1
# Or just type in a terminal:  powershell -File scripts\install-kiosk.ps1
param(
    [string]$Url = "http://localhost:8080/",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
$startupDir = [Environment]::GetFolderPath("Startup")
$lnkPath = Join-Path $startupDir "RestoHub Kiosk.lnk"
$cmdPath = Join-Path $PSScriptRoot "kiosk-start.cmd"

if ($Uninstall) {
    if (Test-Path -LiteralPath $lnkPath) {
        Remove-Item -LiteralPath $lnkPath -Force
        Write-Host "تمت إزالة التشغيل التلقائي." -ForegroundColor Green
    } else {
        Write-Host "لا يوجد تشغيل تلقائي مثبّت." -ForegroundColor Yellow
    }
    exit 0
}

if (-not (Test-Path -LiteralPath $cmdPath)) {
    Write-Error "الملف مفقود: $cmdPath"
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnkPath)
$shortcut.TargetPath = $cmdPath
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$env:WINDIR\System32\shell32.dll,13"
$shortcut.Description = "فتح برنامج المطعم تلقائياً عند تشغيل الكمبيوتر"
$shortcut.Save()

Write-Host ""
Write-Host "تم تثبيت التشغيل التلقائي بنجاح." -ForegroundColor Green
Write-Host "  مسار الاختصار: $lnkPath" -ForegroundColor Cyan
Write-Host "  عند إقلاع الكمبيوتر سيُشغّل البرنامج ويفتح $Url تلقائياً" -ForegroundColor Cyan
Write-Host "  ويعيد الدخول إلى آخر حساب (ويتر / مطبخ / كاشير) بدون تسجيل دخول." -ForegroundColor Cyan
Write-Host ""
Write-Host "لإزالة التشغيل التلقائي:  powershell -File scripts\install-kiosk.ps1 -Uninstall" -ForegroundColor Magenta
Write-Host "لتغيير أمر تشغيل الخادم:  اضبط متغير البيئة RESTOHUB_DEV_COMMAND (افتراضياً: npm run dev)" -ForegroundColor Magenta