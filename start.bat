@echo off
echo Starting 40 Card Game Server...
start "Backend Server" cmd /k "cd server && node index.js"

echo Starting 40 Card Game Client...
start "Frontend Client" cmd /k "cd client && npm run dev -- --open"

echo.
echo =======================================================
echo Both servers are starting up! 
echo Two new terminal windows have been opened.
echo A new tab should open in your browser shortly.
echo If it doesn't, navigate to: http://localhost:5173
echo =======================================================
pause
