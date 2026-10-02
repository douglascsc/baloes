@echo off
chcp 65001 >nul
title RoboSapiens - Rede do note para os juizes
echo ================================================================
echo   ROBOSAPIENS 2026 - REDE DO NOTE (Hotspot do Windows)
echo ================================================================
echo.
echo  1) Vai abrir a tela do Hotspot movel do Windows: LIGUE o Hotspot
echo     e anote o nome da rede e a senha.
echo  2) Conecte os celulares dos juizes nessa rede.
echo  3) Abra o iniciar-servidor.bat e use o endereco /#juiz mostrado
echo     (no Hotspot costuma ser http://192.168.137.1:8000/#juiz).
echo.
echo  Liberando a porta do sistema no firewall (pode pedir permissao de administrador)...
netsh advfirewall firewall add rule name="RoboSapiens Estoura Balao" dir=in action=allow protocol=TCP localport=8000-8010 profile=any >nul 2>&1
if errorlevel 1 (
  echo  - Nao foi possivel liberar automaticamente. Clique com o botao direito
  echo    neste arquivo e escolha "Executar como administrador", ou permita o
  echo    Python quando o Windows perguntar ao abrir o iniciar-servidor.bat.
) else (
  echo  - Porta liberada no firewall.
)
start "" ms-settings:network-mobilehotspot
echo.
pause
