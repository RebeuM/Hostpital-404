@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js n'est pas installe. Installe Node.js LTS puis relance ce fichier.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Premiere installation des bibliotheques React et Three.js...
  call npm install
  if errorlevel 1 (
    echo Erreur : verifie la connexion Internet et Node.js.
    pause
    exit /b 1
  )
)
echo.
echo HOSPITAL 404 - Ouvre http://localhost:5173 dans ton navigateur.
echo.
call npm run dev
pause
