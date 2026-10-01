@echo off
chcp 65001 >nul
title RoboSapiens - Abrir telao na TV
cd /d "%~dp0"

rem ==================================================================
rem  Abre o TELAO direto em tela cheia na segunda tela (TV/projetor).
rem  Usa uma janela propria do navegador (perfil separado), que NAO sai
rem  da tela cheia quando voce clica no sistema na tela do notebook.
rem  Os dados chegam pelo servidor local (iniciar-servidor.bat).
rem ==================================================================

if exist "servidor.py" goto temarquivos
echo.
echo  ERRO: este .bat precisa ficar na pasta do sistema (junto com servidor.py e index.html).
echo.
goto fim
:temarquivos

rem ---- 1) Navegador: Edge ou Chrome ----
set "BROWSER="
for %%F in ("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LocalAppData%\Google\Chrome\Application\chrome.exe") do if not defined BROWSER if exist "%%~F" set "BROWSER=%%~F"
if defined BROWSER goto achounavegador
echo.
echo  Nao encontrei o Microsoft Edge nem o Google Chrome neste computador.
echo.
goto fim
:achounavegador

rem ---- 2) Servidor ligado? (procura nas portas 8000 a 8010) ----
call :acharporta
if defined PORTA goto temservidor
echo  O servidor ainda nao esta ligado. Ligando o iniciar-servidor.bat ...
start "RoboSapiens - Servidor" "%~dp0iniciar-servidor.bat"
for /l %%i in (1,1,15) do (
  if not defined PORTA (
    timeout /t 1 /nobreak >nul
    call :acharporta
  )
)
if defined PORTA goto temservidor
echo.
echo  Nao consegui ligar o servidor. Abra o iniciar-servidor.bat, confira se aparece
echo  "servidor ligado" e depois rode este arquivo de novo.
echo.
goto fim
:temservidor

rem ---- 3) Posicao da segunda tela (TV/projetor) ----
set "TX=" & set "TY="
for /f "tokens=1,2" %%a in ('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $s=([System.Windows.Forms.Screen]::AllScreens).Where({-not $_.Primary})[0]; if($s){''+($s.Bounds.X+80)+' '+($s.Bounds.Y+80)}"') do (
  set "TX=%%a"
  set "TY=%%b"
)
if defined TX goto temtela
echo.
echo  ATENCAO: so encontrei UMA tela. Conecte a TV/projetor e escolha
echo  "Estender" (tecla Windows + P). O telao vai abrir nesta tela mesmo.
echo.
set "TX=80" & set "TY=80"
:temtela

rem ---- 4) Abre o telao em tela cheia na TV ----
echo.
echo  Navegador: %BROWSER%
echo  Telao:     http://localhost:%PORTA%/#telao
echo  Posicao:   %TX%,%TY%
echo.
start "" "%BROWSER%" --user-data-dir="%LocalAppData%\RoboSapiensTelao" --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required --window-position=%TX%,%TY% --start-fullscreen --app="http://localhost:%PORTA%/#telao"
echo  Pronto! O telao abriu em tela cheia na TV.
echo  Para fechar o telao: clique nele e aperte Alt+F4.
echo  (Esta janela fecha sozinha.)
timeout /t 6 >nul
exit /b

:acharporta
set "PORTA="
for /f %%p in ('powershell -NoProfile -Command "foreach($p in 8000..8010){try{$r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 ('http://localhost:'+$p+'/api/info'); if($r.Content -match 'server'){$p; break}}catch{}}"') do set "PORTA=%%p"
exit /b

:fim
pause
