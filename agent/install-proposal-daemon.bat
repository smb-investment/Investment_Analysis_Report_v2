@echo off
REM install-proposal-daemon.bat
REM Registers proposal-daemon.js as a Windows startup item
REM Run once as administrator (or just double-click)

set SCRIPT_DIR=%~dp0
set NODE_PATH=node
set ENV_FILE=%SCRIPT_DIR%.env.proposal
set DAEMON=%SCRIPT_DIR%proposal-daemon.js
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

REM Create VBScript launcher to run daemon without console window
set VBS=%STARTUP%\proposal-daemon.vbs
(
  echo Set objShell = CreateObject("WScript.Shell"^)
  echo objShell.Run "cmd /c cd /d ""%SCRIPT_DIR%.."" ^&^& node --env-file=""%ENV_FILE%"" ""%DAEMON%"" >> ""%SCRIPT_DIR%proposal-daemon.log"" 2^>^&1", 0, False
) > "%VBS%"

echo Registered: %VBS%
echo Starting daemon now...
start "" /B cmd /c "cd /d %SCRIPT_DIR%.. && node --env-file="%ENV_FILE%" "%DAEMON%" >> "%SCRIPT_DIR%proposal-daemon.log" 2>&1"
echo Done. proposal-daemon will auto-start on next login.
pause
