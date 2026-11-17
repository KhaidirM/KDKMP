@echo off
setlocal
cd /d "%~dp0.."

echo Menyiapkan aplikasi KDKMP mode Supabase live...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-live-local.ps1"
if errorlevel 1 (
  echo.
  echo Aplikasi gagal dijalankan. Catat pesan error di atas.
  pause
  exit /b 1
)

endlocal
