@echo off
setlocal
cd /d "%~dp0.."
if errorlevel 1 exit /b 1

call npm run create-admin
if errorlevel 1 exit /b %errorlevel%

call npm start
exit /b %errorlevel%
