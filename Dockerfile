FROM node:12.16.2

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json ./
RUN yarn install && apt update && apt install -y ffmpeg

COPY . .

CMD ["yarn", "start"]