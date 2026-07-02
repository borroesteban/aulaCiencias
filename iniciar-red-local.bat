@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title AulaCiencias - Servidor de red local

echo.
echo ============================================================
echo   AulaCiencias - Publicar la ultima version en la red local
echo ============================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker no esta instalado o no se encuentra en PATH.
  echo Instala o abre Docker Desktop y vuelve a ejecutar este archivo.
  goto :error
)

docker compose version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker Compose no esta disponible.
  echo Actualiza Docker Desktop y vuelve a intentarlo.
  goto :error
)

docker info >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop no esta activo. Intentando abrirlo...

  if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  ) else if exist "%LocalAppData%\Docker\Docker Desktop.exe" (
    start "" "%LocalAppData%\Docker\Docker Desktop.exe"
  ) else (
    echo [ERROR] No se encontro Docker Desktop. Abrelo manualmente.
    goto :error
  )

  echo Esperando a que Docker termine de iniciar...
  call :wait_for_docker
  if errorlevel 1 (
    echo [ERROR] Docker no respondio despues de 2 minutos.
    goto :error
  )
)

:docker_ready
echo [1/4] Docker esta listo.
echo [2/4] Habilitando el acceso por el puerto 8080...

netsh advfirewall firewall show rule name="aulaCiencias_Docker_LAN" >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$args = 'advfirewall firewall add rule name=aulaCiencias_Docker_LAN dir=in action=allow protocol=TCP localport=8080 profile=private'; $p = Start-Process netsh.exe -Verb RunAs -Wait -PassThru -ArgumentList $args; exit $p.ExitCode"
  if errorlevel 1 (
    echo [AVISO] No se pudo crear la regla del firewall.
    echo La pagina funcionara en esta PC, pero Windows podria bloquear otros equipos.
  )
) else (
  echo La regla del firewall ya existe.
)

echo [3/4] Construyendo la ultima version del codigo...
docker compose build --pull
if errorlevel 1 (
  echo [ERROR] Fallo la construccion de la aplicacion.
  goto :error
)

echo [4/4] Iniciando la aplicacion y la base de datos...
docker compose up -d --force-recreate --remove-orphans
if errorlevel 1 (
  echo [ERROR] No se pudieron iniciar los contenedores.
  goto :error
)

echo Esperando que la pagina quede lista...
set /a attempts=0
:wait_for_app
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:8080/api/health; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto :app_ready
timeout /t 2 /nobreak >nul
set /a attempts+=1
if !attempts! LSS 45 goto :wait_for_app

echo [ERROR] La aplicacion no respondio a tiempo. Ultimos registros:
docker compose logs --tail=60 app
goto :error

:app_ready
echo.
echo ============================================================
echo   LISTO - La pagina esta publicada
echo ============================================================
echo.
echo En esta computadora:
echo   http://localhost:8080
echo.
echo Desde otros celulares o computadoras de la misma red Wi-Fi/LAN:
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback|WSL' } ^| Sort-Object InterfaceMetric ^| ForEach-Object { '  http://' + $_.IPAddress + ':8080' }"`) do echo %%I
echo.
echo Todos los dispositivos deben estar conectados a la misma red.
echo Para apagar el servidor ejecuta: docker compose down
echo.
start "" "http://localhost:8080"
pause
exit /b 0

:wait_for_docker
set /a docker_attempts=0
:wait_for_docker_loop
timeout /t 2 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 exit /b 0
set /a docker_attempts+=1
if !docker_attempts! LSS 60 goto :wait_for_docker_loop
exit /b 1

:error
echo.
echo El servidor no pudo iniciarse. Revisa el mensaje anterior.
pause
exit /b 1
