@echo off
chcp 65001 >nul
title RoboSapiens - Servidor Estoura Balao
cd /d "%~dp0"
where py >/dev/null 2>nul
if %errorlevel%==0 (
  py -3 servidor.py
  goto fim
)
where python >/dev/null 2>nul
if %errorlevel%==0 (
  python servidor.py
  goto fim
)
echo.
echo  Python nao encontrado neste computador.
echo  Instale em https://www.python.org/downloads/  (marque "Add python.exe to PATH")
echo  ou pela Microsoft Store (procure por Python 3).
echo  Depois, de dois cliques novamente em iniciar-servidor.bat
echo.
:fim
pause
