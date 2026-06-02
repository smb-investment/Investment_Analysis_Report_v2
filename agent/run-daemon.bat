@echo off
REM Background entry point for the daemon.
REM install-daemon.bat creates a Startup .lnk pointing to this file.
REM Output/error are appended to daemon.log by daemon.js itself.

setlocal
cd /d "%~dp0"

REM Locate node.exe
where node >nul 2>&1
if errorlevel 1 (
  set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
) else (
  set "NODE_EXE=node"
)

REM Start daemon
"%NODE_EXE%" --env-file=.env daemon.js

endlocal
