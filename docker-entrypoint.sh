#!/bin/bash
Xvfb :99 -ac & export DISPLAY=:99
if [ $ENABLED_X11VNC == 'yes' ]; then
  x11vnc -display :99 -forever -bg -o /var/log/x11vnc.log -rfbport 5900
fi
cd /bot
npm run dev
