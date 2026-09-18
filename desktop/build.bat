@echo off
echo ========================================
echo   SahlDZ Desktop - Build Script
echo ========================================
echo.

echo [1/2] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b 1
)

echo.
echo [2/2] Building desktop app...
call npx electron-builder --win --ia32
if %errorlevel% neq 0 (
    echo Error building desktop app!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build complete!
echo   Output: desktop\release-build\
echo ========================================
pause
