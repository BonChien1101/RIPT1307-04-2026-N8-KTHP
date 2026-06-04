@echo off
echo Starting Frontend dev server with local Node/npm...
set "PATH=C:\Users\hnc2801\AppData\Local\ms-playwright-go\1.57.0;C:\Users\hnc2801\AppData\Local\pnpm;%PATH%"
set "NODE_OPTIONS=--openssl-legacy-provider"
set "API_URL=http://localhost:5000"
npm run dev
