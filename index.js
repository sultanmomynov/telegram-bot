process.env["NTBA_FIX_319"] = 1;
process.env["NTBA_FIX_350"] = 1;

// Requirements
const TelegramBot = require('node-telegram-bot-api')
const config = require('config')
const youtubedl = require('youtube-dl')
const token = config.get('token')
const ffmetadata = require('ffmetadata')
const fs = require('fs')
const args = require('./modules/youtubedl-args')

const bot = new TelegramBot(token, {
  polling: true,
  filepath: false
});

const youtube_link_regex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?(feature.+)?(?:\?t=\d?\d?\d?)? : (.+)/
const linksArray = fs.readFileSync('./misc/list.txt').toString().split("\n");


bot.on('message', msg => {

  let message = msg.text
  let bot_chat_id = msg.chat.id
  let channel_id = config.get('channel_id')

  // tmp

  switch (true) {

    case /\/dl (.+)/.test(message):

      match = message.split(youtube_link_regex)

      console.log(match)

      // Metadata

      let video_id = match[1]
      let extra = match[3]
      let url = 'https://www.youtube.com/watch?v=' + video_id
      let artist = extra.split(" | ")[0].split(" - ")[0]
      let title = extra.split(" | ")[0].split(" - ")[1]
      let type_key = extra.split(" | ")[1]


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

      let gachi_metadata = {
        artist: '♂ ' + artist,
        title: title + ' ♂',
        album: 'Gachimuchi'
      }

      let metadata = {
        artist: artist,
        title: title
      }

      console.log(`\nDownloading...\n`);

      youtubedl.exec(url, args, {}, (err, out) => {

        if (err) {
          bot.sendMessage(bot_chat_id, 'Error occured. Try again')
          throw console.error(err)
        } else {
          bot.sendMessage(channel_id, url);
          console.log(out.join('\n'))
          console.log(`\nDownload finished.`)

          let old_path = './tmp/' + video_id + '.mp3'
          let new_path = './tmp/' + artist + ' - ' + title + '.mp3'
          let attach = './tmp/' + video_id + '.jpg'

          fs.rename(old_path, new_path, () => {

            let options = {
              attachments: [attach]
            }

            if (type_key == 'GACHI' || type_key == 'gachi' || type_key == 'Gachi') {
              metadata = gachi_metadata
            }

            ffmetadata.write(new_path, metadata, options, (err) => {

              if (err) throw err

              console.log('Metadata written.');
              console.log('Sending audio...');

              bot.sendAudio(channel_id, fs.createReadStream(new_path)).then(() => {

                console.log('Audio is delivered.')

                fs.unlink(new_path, (err) => {
                  if (err) throw err;
                  console.log(`File is deleted`);
                });

                fs.unlink(attach, (err) => {
                  if (err) throw err;
                  console.log(`Artwork is deleted`);
                })

              }).then(() => {
                bot.sendMessage(bot_chat_id, 'Done.')
              })

            })

          })
        }
      })
      break;

    case message == '/dl':
      bot.sendMessage(bot_chat_id, "Format: /dl youtube_link : artist - title")
      console.log('dl message triggered')
      break;

    case message == '/random':
      let item = linksArray[Math.floor(Math.random() * linksArray.length)]
      bot.sendMessage(bot_chat_id, item)
      console.log('random command triggered')
      break;

    default:
      bot.sendMessage(bot_chat_id, 'Command unknown')
  }

})