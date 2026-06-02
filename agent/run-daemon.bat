@echo off
REM 데몬 백그라운드 실행 진입점.
REM install-daemon.bat 이 만든 시작프로그램 .lnk 가 이 파일을 가리킴.
REM 콘솔 창은 minimize 상태로 백그라운드 동작.

setlocal
cd /d "%~dp0"

REM Node.js 가 PATH 에 있는지 확인 (안 보이면 일반적인 위치 시도)
where node >nul 2>&1
if errorlevel 1 (
  set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
) else (
  set "NODE_EXE=node"
)

REM 데몬 시작 — 표준출력/에러는 daemon.js 가 daemon.log 로 직접 append
"%NODE_EXE%" --env-file=.env daemon.js

endlocal
