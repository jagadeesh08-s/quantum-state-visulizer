@echo off
echo [AUTO-RESTART] Finding and processing python operations...

REM Attempt to kill only the specific process running main.py if possible
REM But simplified: we will try to kill python.exe. In this env, likely only the server uses it publicly.
taskkill /F /IM python.exe
IF %ERRORLEVEL% EQU 0 (
    echo [AUTO-RESTART] Old server stopped.
) ELSE (
    echo [AUTO-RESTART] No running server found or could not kill. (This is fine if it wasn't running)
)

echo [AUTO-RESTART] Waiting for port 3005 to clear...
timeout /t 3 /nobreak >nul

echo [AUTO-RESTART] Starting new server instance...
python main.py
