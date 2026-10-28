@echo off
title EduRetain - Web Client (Vite)
cd /d "%~dp0"
(call npm.cmd run dev) 2>&1 | node "%~dp0..\scripts\tee.js" "%~dp0..\logs\client.log"
pause
