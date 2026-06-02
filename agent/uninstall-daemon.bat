@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo.
echo  ============================================================
echo   Investment Analysis Daemon 제거
echo  ============================================================
echo.

cd /d "%~dp0"

REM 1) 시작프로그램 폴더에서 .lnk 제거
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LNK_PATH=%STARTUP%\InvestmentAnalysisDaemon.lnk"

if exist "%LNK_PATH%" (
  del /f /q "%LNK_PATH%"
  echo  [*] 시작프로그램 등록 해제: %LNK_PATH%
) else (
  echo  [-] 시작프로그램 등록이 없습니다.
)

REM 2) 현재 떠 있는 데몬 프로세스 종료 (PID 파일 사용)
if exist "daemon.pid" (
  set /p PID=<daemon.pid
  echo  [*] 데몬 프로세스 종료 시도: PID !PID!
  taskkill /PID !PID! /F >nul 2>&1
  if !errorlevel! equ 0 (
    echo      종료 성공
  ) else (
    echo      종료 실패 또는 이미 종료됨
  )
  del /f /q daemon.pid >nul 2>&1
) else (
  echo  [-] daemon.pid 가 없습니다 (데몬이 떠 있지 않을 가능성).
)

echo.
echo  ============================================================
echo   [OK] 데몬 제거 완료
echo  ============================================================
echo   - PC 재시작 시 더 이상 자동 실행되지 않습니다.
echo   - 다시 켜려면 install-daemon.bat 을 실행하세요.
echo  ============================================================
echo.

pause
endlocal
