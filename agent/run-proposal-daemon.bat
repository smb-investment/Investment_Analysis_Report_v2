@echo off
cd /d "%~dp0.."
node --env-file="%~dp0.env.proposal" "%~dp0proposal-daemon.js" >> "%~dp0proposal-daemon.log" 2>&1
