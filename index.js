process.env["NTBA_FIX_319"] = 1;
process.env["NTBA_FIX_350"] = 1;

// Requirements
const TelegramBot = require('node-telegram-bot-api')
const config = require('config')
const youtubedl = require('youtube-dl')
const token = config.get('token')

const bot = new TelegramBot(token, { polling: true });

const linkRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/
const channel_id = config.get('channel_id')


bot.on('message', (msg) => {

  if (linkRegex.test(msg.text)) {

    let url = msg.text
    bot.sendMessage(channel_id, url);

    const a = new Promise((resolve, reject) => {
      console.log(`\nDownloading...\n`);

      const args = [
        '-x',
        '--audio-format',
        'mp3',
        '-o',
        './tmp/%(id)s.%(ext)s'
      ]

      youtubedl.exec(url, args, {}, (err, out) => {
        if (err) {
          console.log(out.join('\n'))
          bot.sendMessage(channel_id, 'Error occured')
          throw err
        }
        console.log(out.join('\n'))
        console.log(`\nDownload finished.`)
        resolve(out);
      })
    })

    a.then((data) => {
      let kek = data[0].split(" ")[1].replace(':', '.mp3')
      let file_name = './tmp/' + kek
      console.log('Sending audio...');
      bot.sendAudio(channel_id, file_name).then(() => {
        console.log('Audio is delivered.')
      })

    })
  }
});