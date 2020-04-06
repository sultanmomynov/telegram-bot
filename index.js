process.env["NTBA_FIX_319"] = 1;
process.env["NTBA_FIX_350"] = 1;

// Requirements
const TelegramBot = require('node-telegram-bot-api')
const config = require('config')
const token = config.get('token')
const ffmetadata = require('ffmetadata')
const fs = require('fs')
const deleteTempFiles = require('./modules/deleteTempFiles')
const downloadAudio = require('./modules/youtubeDownloader')
const writeMetadata = require('./modules/writeMetadata')

const bot = new TelegramBot(token, {
  polling: true,
  filepath: false
});

const youtube_link_regex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?(feature.+)?(?:\?t=\d?\d?\d?)? : (.+)/
const linksArray = fs.readFileSync('./misc/list.txt').toString().split("\n");


bot.on("polling_error", (msg) => console.log(msg));

bot.on('message', msg => {

  let message = msg.text
  let bot_chat_id = msg.chat.id
  let channel_id = config.get('channel_id')

  // tmp

  switch (true) {

    case /\/dl (.+)/.test(message):

      match = message.split(youtube_link_regex)

      // Metadata

      let video_id = match[1]
      let extra = match[3]
      let url = 'https://www.youtube.com/watch?v=' + video_id



      if (extra.includes('/')) {
        bot.sendMessage(bot_chat_id, 'Metadata cannot contain \'/\'.')
        throw console.error('Metadata cannot contain \'/\'.')
      }

      if (!extra.includes(' - ')) {
        bot.sendMessage(bot_chat_id, 'Incorrect metadata format. Should be the following: artist - title')
        throw console.error('Incorrect metadata format')
      }

      if (extra == undefined) {
        bot.sendMessage(bot_chat_id, 'No metadata priveded. Use the following syntax: "/dl <youtube link> : artist - title"')
        throw console.error('No metadata priveded')
      }


      downloadAudio(url).then(() => {

        let artist = extra.split(" | ")[0].split(" - ")[0]
        let title = extra.split(" | ")[0].split(" - ")[1]
        let type_key = extra.split(" | ")[1]

        let old_path = './tmp/' + video_id + '.mp3'
        let new_path = './tmp/' + artist + ' - ' + title + '.mp3'
        let attach = './tmp/' + video_id + '.jpg'

        let gachi_metadata = {
          artist: '♂ ' + artist,
          title: title + ' ♂',
          album: 'Gachimuchi'
        }

        let metadata = {
          artist: artist,
          title: title
        }

        fs.rename(old_path, new_path, () => {

          let options = {
            attachments: [attach]
          }

          if (type_key == 'GACHI' || type_key == 'gachi' || type_key == 'Gachi') {
            metadata = gachi_metadata
          }

          ffmetadata.write(new_path, metadata, options, (err) => {

            if (err) throw err

            console.log('Sending audio...');

            bot.sendMessage(channel_id, url)
              .then(() => {

                bot.sendAudio(channel_id, fs.createReadStream(new_path)).then(() => {

                  console.log('Audio is delivered.')

                  deleteTempFiles(new_path, attach);

                })
                  .then(() => {
                    bot.sendMessage(bot_chat_id, 'Done.')
                  })

              })


          })

        })
      })
      break;

    case message == '/dl':
      bot.sendMessage(bot_chat_id, "Format: /dl youtube_link : artist - title")
      console.log('dl message triggered')
      break;

    case message == '/random':
      let item = linksArray[Math.floor(Math.random() * linksArray.length)]
      bot.sendMessage(bot_chat_id, item)
      console.log('/random command triggered')
      break;

    case message == '/ping':
      bot.sendMessage(bot_chat_id, 'pong!')
      break;

    default:
      bot.sendMessage(bot_chat_id, 'Unknown command')
  }

})