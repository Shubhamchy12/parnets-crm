@echo off
echo Starting CRM System...
echo.

echo Starting MongoDB (make sure MongoDB is installed and running)
echo.

echo Starting Backend Server...
start "CRM Backend" cmd /k "cd crm-backend && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "CRM Frontend" cmd /k "cd crm-frontent && npm run dev"

echo.
echo CRM System is starting up!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause > nul