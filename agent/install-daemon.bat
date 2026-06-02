@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo.
echo  ============================================================
echo   Investment Analysis Daemon 설치
echo  ============================================================
echo.

cd /d "%~dp0"

REM 1) Node.js 확인
where node >nul 2>&1
if errorlevel 1 (
  echo  [!] Node.js 가 설치되어 있지 않거나 PATH 에 없습니다.
  echo      https://nodejs.org 에서 LTS 버전을 먼저 설치하세요.
  echo.
  pause
  exit /b 1
)

REM 2) claude CLI 확인
where claude >nul 2>&1
if errorlevel 1 (
  echo  [!] claude CLI 가 설치되어 있지 않거나 PATH 에 없습니다.
  echo      Claude Code 설치 후 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

REM 3) .env 확인
if not exist ".env" (
  echo  [!] agent\.env 파일이 없습니다.
  echo      SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 들어있어야 합니다.
  echo.
  pause
  exit /b 1
)

REM 4) 의존성 설치 (최초 1회만)
if not exist "node_modules" (
  echo  [*] npm 의존성 설치 중...
  call npm install
  if errorlevel 1 (
    echo  [!] npm install 실패
    pause
    exit /b 1
  )
)

REM 5) 시작프로그램 폴더에 .lnk 단축키 생성
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "DAEMON_BAT=%~dp0run-daemon.bat"
set "LNK_PATH=%STARTUP%\InvestmentAnalysisDaemon.lnk"

echo  [*] Windows 시작프로그램에 데몬 등록 중...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = New-Object -ComObject WScript.Shell;" ^
  "$sc = $s.CreateShortcut('%LNK_PATH%');" ^
  "$sc.TargetPath = '%DAEMON_BAT%';" ^
  "$sc.WorkingDirectory = '%~dp0';" ^
  "$sc.WindowStyle = 7;" ^
  "$sc.Description = 'Investment Analysis Daemon';" ^
  "$sc.Save()"

if errorlevel 1 (
  echo  [!] 시작프로그램 등록 실패
  pause
  exit /b 1
)

REM 6) 이미 떠 있는 데몬 종료 (있으면)
if exist "daemon.pid" (
  set /p OLD_PID=<daemon.pid
  taskkill /PID !OLD_PID! /F >nul 2>&1
  del /f /q daemon.pid >nul 2>&1
)

REM 7) 데몬 즉시 시작 (백그라운드, 창 숨김)
echo  [*] 데몬 시작 중...
start "InvestmentAnalysisDaemon" /MIN cmd /c "%DAEMON_BAT%"

REM 8) 데몬이 떠는지 잠깐 확인
timeout /t 3 /nobreak >nul
if exist "daemon.pid" (
  set /p NEW_PID=<daemon.pid
  echo.
  echo  ============================================================
  echo   [OK] 데몬 설치 완료
  echo  ============================================================
  echo   PID         : !NEW_PID!
  echo   자동 실행  : %LNK_PATH%
  echo   로그        : %~dp0daemon.log
  echo.
  echo   - PC 시작 시 자동으로 데몬이 켜집니다.
  echo   - 사이트에서 [분석 시작] 누르면 자동으로 분석이 진행됩니다.
  echo   - 제거하려면 uninstall-daemon.bat 을 실행하세요.
  echo  ============================================================
) else (
  echo.
  echo  [!] 데몬 시작 확인 실패. daemon.log 를 확인하세요.
  echo      또는 install-daemon.bat 을 다시 실행하세요.
)

echo.
pause
endlocal
