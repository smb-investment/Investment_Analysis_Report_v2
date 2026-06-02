@echo off
setlocal enabledelayedexpansion

echo.
echo  ============================================================
echo   Investment Analysis Daemon - Install
echo  ============================================================
echo.

cd /d "%~dp0"

REM 1) Node.js check
where node >nul 2>&1
if errorlevel 1 (
  echo  [!] Node.js is not installed or not in PATH.
  echo      Install LTS from https://nodejs.org first.
  echo.
  pause
  exit /b 1
)

REM 2) claude CLI check
where claude >nul 2>&1
if errorlevel 1 (
  echo  [!] claude CLI is not installed or not in PATH.
  echo      Install Claude Code first.
  echo.
  pause
  exit /b 1
)

REM 3) .env check
if not exist ".env" (
  echo  [!] agent\.env not found.
  echo      Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
  echo.
  pause
  exit /b 1
)

REM 4) npm install (first time only)
if not exist "node_modules" (
  echo  [*] Installing npm dependencies...
  call npm install
  if errorlevel 1 (
    echo  [!] npm install failed
    pause
    exit /b 1
  )
)

REM 5) Create startup shortcut
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "DAEMON_BAT=%~dp0run-daemon.bat"
set "LNK_PATH=%STARTUP%\InvestmentAnalysisDaemon.lnk"

echo  [*] Registering daemon in Windows Startup...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = New-Object -ComObject WScript.Shell;" ^
  "$sc = $s.CreateShortcut('%LNK_PATH%');" ^
  "$sc.TargetPath = '%DAEMON_BAT%';" ^
  "$sc.WorkingDirectory = '%~dp0';" ^
  "$sc.WindowStyle = 7;" ^
  "$sc.Description = 'Investment Analysis Daemon';" ^
  "$sc.Save()"

if errorlevel 1 (
  echo  [!] Failed to register startup shortcut
  pause
  exit /b 1
)

REM 6) Kill any existing daemon
if exist "daemon.pid" (
  set /p OLD_PID=<daemon.pid
  taskkill /PID !OLD_PID! /F >nul 2>&1
  del /f /q daemon.pid >nul 2>&1
)

REM 7) Start daemon immediately (background, minimized)
echo  [*] Starting daemon...
start "InvestmentAnalysisDaemon" /MIN cmd /c "%DAEMON_BAT%"

REM 8) Confirm
timeout /t 3 /nobreak >nul
if exist "daemon.pid" (
  set /p NEW_PID=<daemon.pid
  echo.
  echo  ============================================================
  echo   [OK] Daemon installed
  echo  ============================================================
  echo   PID         : !NEW_PID!
  echo   Auto-start  : %LNK_PATH%
  echo   Log         : %~dp0daemon.log
  echo.
  echo   - The daemon will auto-start every time you boot the PC.
  echo   - Clicking [Start Analysis] on the website triggers analysis automatically.
  echo   - To remove, run uninstall-daemon.bat
  echo  ============================================================
) else (
  echo.
  echo  [!] Could not confirm daemon start. Check daemon.log
  echo      or re-run install-daemon.bat
)

echo.
pause
endlocal
