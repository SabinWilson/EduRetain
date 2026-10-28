@echo off
title EduRetain - Backend API (Express)
cd /d "%~dp0"
(node src\index.js) 2>&1 | node "%~dp0..\scripts\tee.js" "%~dp0..\logs\server.log"
pause
