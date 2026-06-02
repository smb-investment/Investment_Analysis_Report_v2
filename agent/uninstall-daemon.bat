@echo off
setlocal enabledelayedexpansion

echo.
echo  ============================================================
echo   Investment Analysis Daemon - Uninstall
echo  ============================================================
echo.

cd /d "%~dp0"

REM 1) Remove startup shortcut
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LNK_PATH=%STARTUP%\InvestmentAnalysisDaemon.lnk"

if exist "%LNK_PATH%" (
  del /f /q "%LNK_PATH%"
  echo  [*] Removed startup shortcut: %LNK_PATH%
) else (
  echo  [-] No startup shortcut found.
)

REM 2) Kill running daemon by PID
if exist "daemon.pid" (
  set /p PID=<daemon.pid
  echo  [*] Killing daemon process: PID !PID!
  taskkill /PID !PID! /F >nul 2>&1
  if !errorlevel! equ 0 (
    echo      Done
  ) else (
    echo      Already stopped or failed
  )
  del /f /q daemon.pid >nul 2>&1
) else (
  echo  [-] No daemon.pid found.
)

echo.
echo  ============================================================
echo   [OK] Daemon uninstalled
echo  ============================================================
echo   - The daemon will NOT auto-start on next PC boot.
echo   - To re-enable, run install-daemon.bat
echo  ============================================================
echo.

pause
endlocal
