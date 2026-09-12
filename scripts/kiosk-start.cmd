@echo off
rem RestoHub kiosk starter.
rem Starts the dev server only if it is not already running, waits until it
rem responds, then opens the app in the default browser. The web app itself
rem auto-logs into the last staff session (waiter / kitchen / cashier).
rem Override the server command with the RESTOHUB_DEV_COMMAND env var.
setlocal
set "URL=http://localhost:8080/"
cd /d "%~dp0\.."

curl -s -o NUL %URL% 2>NUL
if not errorlevel 1 goto open

set "DEV_CMD=%RESTOHUB_DEV_COMMAND%"
if "%DEV_CMD%"=="" set "DEV_CMD=npm run dev"
start "RestoHub Server" /min cmd /c "%DEV_CMD% > kiosk-server.log 2>&1"

set /a RETRIES=0
:wait
curl -s -o NUL %URL% 2>NUL
if not errorlevel 1 goto open
set /a RETRIES+=1
if %RETRIES% GEQ 30 (
  echo Server did not start within 60 seconds. Check kiosk-server.log for errors.
  start notepad kiosk-server.log
  exit /b 1
)
timeout /t 2 /nobreak >NUL
goto wait

:open
start "" %URL%
endlocal