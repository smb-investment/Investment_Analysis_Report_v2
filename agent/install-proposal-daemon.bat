@echo off
REM install-proposal-daemon.bat
REM Registers proposal-daemon.js as a Windows startup item
REM Run once (double-click)

set SCRIPT_DIR=%~dp0
set RUNNER=%SCRIPT_DIR%run-proposal-daemon.bat
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS=%STARTUP%\proposal-daemon.vbs

REM Write PID file path for reference
echo %SCRIPT_DIR%proposal-daemon.pid

REM Create VBScript launcher in Startup folder (runs silently, no console window)
(
  echo Set objShell = CreateObject^("WScript.Shell"^)
  echo objShell.Run "%RUNNER%", 0, False
) > "%VBS%"

echo Registered: %VBS%
echo Starting daemon now...
start "" "%RUNNER%"
echo Done. proposal-daemon will auto-start on next login.
pause
