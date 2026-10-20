@echo off
if exist "%LOCALAPPDATA%\nvm\v22.21.1\node.exe" (
  set "PATH=%LOCALAPPDATA%\nvm\v22.21.1;%PATH%"
)
cd /d "%~dp0"
npx electron . %*
