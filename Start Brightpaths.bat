@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo This computer needs Node.js 22 before the site can open.
  echo Install it from https://nodejs.org, then double-click Start Brightpaths again.
  echo.
  pause
  exit /b 1
)
node scripts\start-portal.mjs
