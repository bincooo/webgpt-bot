#!/bin/bash
Xvfb :99 -ac & export DISPLAY=:99
x11vnc -display :99 -forever -bg -o /var/log/x11vnc.log -rfbport 5900
cd /bot
npm run dev
