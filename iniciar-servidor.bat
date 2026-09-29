@echo off
chcp 65001 >nul
title RoboSapiens - Servidor Estoura Balao
cd /d "%~dp0"
set "PYEXE="

rem O .bat precisa estar na mesma pasta dos arquivos do sistema
if exist "servidor.py" goto achou
echo.
echo  ERRO: o arquivo servidor.py nao esta nesta pasta:
echo    %CD%
echo.
echo  Este .bat precisa ficar junto com os arquivos do sistema
echo  (servidor.py, index.html, script.js, style.css e a pasta assets).
echo  Baixe o sistema completo em:
echo    https://github.com/douglascsc/baloes/archive/refs/heads/main.zip
echo  extraia o ZIP e rode o iniciar-servidor.bat que esta dentro da pasta.
echo.
goto fim
:achou

rem 1) Pasta onde o Python foi instalado neste computador
if exist "C:\Program Files (x86)\Python-3.14.7\python.exe" set "PYEXE=C:\Program Files (x86)\Python-3.14.7\python.exe"
if defined PYEXE goto rodar

rem 2) Outras pastas comuns de instalacao
for /d %%D in ("%ProgramFiles(x86)%\Python*" "%ProgramFiles%\Python*" "%LocalAppData%\Programs\Python\Python*" "%LocalAppData%\Python\pythoncore-*" "C:\Python*") do if exist "%%~D\python.exe" set "PYEXE=%%~D\python.exe"
if defined PYEXE goto rodar

rem 3) Python no PATH
where py >nul 2>nul
if %errorlevel%==0 goto rodarpy
where python >nul 2>nul
if %errorlevel%==0 goto rodarpython

echo.
echo  Python nao encontrado neste computador.
echo  Instale em https://www.python.org/downloads/  (marque "Add python.exe to PATH")
echo  ou edite este arquivo e informe a pasta onde o python.exe esta instalado.
echo.
goto fim

:rodar
echo  Usando: %PYEXE%
"%PYEXE%" servidor.py
goto fim

:rodarpy
py -3 servidor.py
goto fim

:rodarpython
python servidor.py

:fim
pause
