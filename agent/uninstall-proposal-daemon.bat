@echo off
REM uninstall-proposal-daemon.bat

set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS=%STARTUP%\proposal-daemon.vbs

if exist "%VBS%" (
  del "%VBS%"
  echo Removed: %VBS%
) else (
  echo Not found: %VBS%
)

REM Kill running daemon process
for /f "tokens=2" %%i in ('type "%~dp0proposal-daemon.pid" 2^>nul') do (
  taskkill /PID %%i /F >nul 2>&1
  echo Killed PID %%i
)

echo proposal-daemon uninstalled.
pause
