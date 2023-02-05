FROM node:18-slim

WORKDIR /bot

ADD package.json docker-entrypoint.sh /bot/

#RUN npm config set registry https://registry.npm.taobao.org \
#    && npm config set disturl https://npm.taobao.org/dist \
#    && npm config set puppeteer_download_host https://npm.taobao.org/mirrors

# Suppress an apt-key warning about standard out not being a terminal. Use in this script is safe.
ENV APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn
# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
#RUN sed -i s/deb.debian.org/mirrors.aliyun.com/g /etc/apt/sources.list
RUN sed -i s/deb.debian.org/mirrors.huaweicloud.com/g /etc/apt/sources.list
RUN apt-get update \
  && apt-get install -y wget gnupg xvfb x11vnc \
  && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*
RUN chmod +x /bot/docker-entrypoint.sh

ADD . /bot
RUN npm i
#ENTRYPOINT ["tail","-f","/dev/null"]
ENTRYPOINT ["/bin/bash", "/bot/docker-entrypoint.sh"]
# Xvfb :99 -ac & export DISPLAY=:99
# x11vnc -display :99 -auth /tmp/xvfb-run.nrviNq/Xauthority
# x11vnc -display :99 -forever -bg -o /var/log/x11vnc.log -rfbport 5900
