@echo off
title Smart Campus Dev Starter
echo Starting Backend and Frontend locally...

:: Set paths to local Node.js and pnpm
set "PATH=C:\Users\hnc2801\AppData\Local\ms-playwright-go\1.57.0;C:\Users\hnc2801\AppData\Roaming\npm;%PATH%"

:: Set required environment variables
set "NODE_OPTIONS=--openssl-legacy-provider"
set "API_URL=http://localhost:5000"

:: Start backend in a new command window
echo Launching Backend server...
start "Backend API Server" cmd /c "cd /d \"%~dp0backend\" && pnpm run dev"

:: Start frontend in the current window
echo Launching Frontend dev server...
cd /d "%~dp0frontend"
pnpm run start
