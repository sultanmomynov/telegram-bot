# Telegram bot

YouTube videos to MP3 converter bot

## Requirements

- NodeJS
- FFMPEG (with ffprobe)

## Installation

1. clone repository
2. `cd telegram-bot`
3. `yarn install`
4. create `config/default.json`

```json
{
  "token": "<BOT_TOKEN>",
  "channel_id": "<CHANNEL_ID>",
  "admins": []
}
```

## Usage

1. `yarn start`
