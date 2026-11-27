@echo off
title Neon Agent Studio (Gemini 4 Neon Extra High)
cd /d "%~dp0"
echo Iniciando Neon Agent Studio em http://127.0.0.1:4321 ...
start "" "http://127.0.0.1:4321"
node server.js
pause
