#!/bin/bash

cd /root/telegram-bot
forever start -o src/logs/logs.txt -e src/logs/logs.txt -a src/index.js
