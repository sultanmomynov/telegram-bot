process.env["NTBA_FIX_319"] = 1;
process.env["NTBA_FIX_350"] = 1;

// Requirements
const TelegramBot = require('node-telegram-bot-api')
const config = require('config')
const youtubedl = require('youtube-dl')
const token = config.get('token')
const ffmetadata = require('ffmetadata')
const fs = require('fs')

const bot = new TelegramBot(token, { polling: true });

const youtube_link_regex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?(feature.+)?(?:\?t=\d?\d?\d?)? : (.+)/


const channel_id = config.get('channel_id')


bot.onText(youtube_link_regex, (msg, match) => {

  let url = 'https://www.youtube.com/watch?v=' + match[1]
  
  // Metadata
  let artist = match[match.length - 1].split(" | ")[0].split(" - ")[0]
  let title = match[match.length - 1].split(" | ")[0].split(" - ")[1]
  let type_key = match[match.length - 1].split(" | ")[1]

  if (artist.includes('/') || title.includes('/')) {
    bot.sendMessage(msg.chat.id, 'Metadata cannot contain \'/\'.')
    throw console.error('Metadata cannot contain \'/\'.')
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


  let a = new Promise((resolve, reject) => {

    console.log(`\nDownloading...\n`);

    const args = [
      '-x',
      '--audio-format',
      'mp3',
      '-o',
      './tmp/%(id)s.%(ext)s',
      '--write-thumbnail',
      '--cookies',
      './config/cookies.txt'
    ]

    youtubedl.exec(url, args, {}, (err, out) => {

      if (err) {
        bot.sendMessage(msg.chat.id, 'Error occured. Try again')
        throw console.error(err)
      }
      else {
        bot.sendMessage(channel_id, url);
        console.log(out.join('\n'))
        console.log(`\nDownload finished.`)
        resolve();
      }

    })
  })

  a.then(() => {

    let old_path = './tmp/' + match[1] + '.mp3'
    let new_path = './tmp/' + artist + ' - ' + title + '.mp3'

    let attach = './tmp/' + match[1] + '.jpg'

    fs.rename(old_path, new_path, () => {

      let options = {
        attachments: [attach]
      }

      if (type_key == 'GACHI' || type_key == 'gachi' || type_key == 'Gachi') metadata = gachi_metadata

      ffmetadata.write(new_path, metadata, options, (err) => {

        if (err) {
          throw err
        } else {
          console.log('Metadata written.');
          console.log('Sending audio...');

          bot.sendAudio(channel_id, new_path).then(() => {

            console.log('Audio is delivered.')

            // fs.unlink(new_path, (err) => {
            //   if (err) throw err;
            //   console.log(`${new_path} is deleted`);
            // });

            fs.unlink(attach, (err) => {
              if (err) throw err;
              console.log(`${new_path} is deleted`);
            })

          }).then(() => {
            bot.sendMessage(msg.chat.id, 'Done.')
          })
        }

      })

    })
  })
});
