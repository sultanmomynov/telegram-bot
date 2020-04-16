process.env["NTBA_FIX_319"] = 1;
process.env["NTBA_FIX_350"] = 1;
// Requirements
const TelegramBot = require('node-telegram-bot-api')
const config = require('config')
const token = config.get('token')
const ffmetadata = require('ffmetadata')
const fs = require('fs')
const downloadAudio = require('./modules/youtubeDownloader')
const getYoutubeId = require('get-youtube-id')
const helper = require('./modules/helper')
const chalk = require('chalk')
const logger = require('./modules/logger')
const deleteTempFiles = require('./modules/deleteTempFiles')
const linksArray = fs.readFileSync(__dirname + '/../misc/list.txt').toString().split("\n");
const readLastLines = require('read-last-lines');

helper.logStart()

const bot = new TelegramBot(token, {
  polling: true,
  filepath: false
})

const admins = config.get('admins')
let channel_id = config.get('channel_id')

bot.on('polling_error', (msg) => {
  console.log(msg);
})

// Messages logger
bot.on('message', msg => {
  event = `${ msg.from.username }: ${ msg.text }`
  console.log(chalk.cyan(`[${ helper.getDate() }] ${ event }`))
  logger.log(event)
})

bot.onText(/\/start/, msg => {
  bot.sendMessage(helper.getChatId(msg), helper.greet(msg), {
    parse_mode: 'Markdown'
  })
})

bot.onText(/\/logs( \d+)?/, (msg, match) => {
  let chat_id = helper.getChatId(msg)

  if (admins.includes(msg.from.id)) {
    let num_of_lines
    match[1] === undefined ? num_of_lines = 10 : num_of_lines = match[1]
    readLastLines.read(__dirname + '/logs', num_of_lines)
      .then((lines) => {
        bot.sendMessage(chat_id, `<strong>Showing last ${ num_of_lines } log lines</strong>:\n\n${ lines }`, {
          parse_mode: 'HTML'
        })
          .catch(err => {
            console.log(err)
            bot.sendMessage(chat_id, `*ERROR* ${ err.response.body.description }`, {
              parse_mode: 'Markdown'
            })
          })
      })
  } else return
})

bot.onText(/\/random/, msg => {
  let item = linksArray[Math.floor(Math.random() * linksArray.length)]
  bot.sendMessage(helper.getChatId(msg), item)
})

bot.onText(/\/dl/, msg => {

  let chatId = helper.getChatId(msg)

  bot.sendMessage(chatId, helper.ask_link_message, {
    parse_mode: 'Markdown'
  })
})

bot.onText(/https?(.+)/, msg => {
  video_id = getYoutubeId(msg.text)

  if (admins.includes(msg.from.id)) {
    bot.sendMessage(helper.getChatId(msg), helper.ask_tags_message, {
      reply_markup: {
        inline_keyboard: helper.admin_inline_keyboard
      }
    })
  } else {
    bot.sendMessage(helper.getChatId(msg), helper.ask_tags_message, {
      reply_markup: {
        inline_keyboard: helper.usual_inline_keyboard
      }
    })
  }

})

bot.on('callback_query', query => {

  event = `${ query.message.chat.username }: ${ query.data } (callback_query)`
  console.log(chalk.cyan(`[${ helper.getDate() }] ${ event }`))
  logger.log(event)

  let chat_id = helper.getChatId(query)

  switch (query.data) {

    case 'no':
      let url = 'https://www.youtube.com/watch?v=' + video_id
      bot.sendMessage(chat_id, helper.working_message)

      downloadAudio(url)
        .then(() => {

          let path = './tmp/' + video_id + '.mp3'
          let attach = './tmp/' + video_id + '.jpg'

          bot.sendAudio(chat_id, fs.createReadStream(path))
            .catch((err) => {
              console.log(err)
              bot.sendMessage(chat_id, `*ERROR* ${ err.response.body.description }`, {
                parse_mode: 'Markdown'
              })
            })
            .then(() => {
              deleteTempFiles(path, attach)
              bot.deleteMessage(chat_id, query.message.message_id)
              bot.deleteMessage(chat_id, query.message.message_id + 1)
              console.log(`[${ helper.getDate() }] Audio is delivered.`)
            })
        })
      type_flag = 'normal'
      break;

    case 'yes':
      bot.sendMessage(chat_id, helper.send_tags_message, {
        parse_mode: 'Markdown'
      })
      type_flag = 'normal'
      break;

    case 'gachi':
      bot.sendMessage(chat_id, helper.send_gachi_tags_message, {
        parse_mode: 'Markdown'
      })
      type_flag = 'gachi'
      break;
  }
})

bot.onText(/^(.*) (-|–) (.*)$/, (msg, match) => {

  bot_chat_id = helper.getChatId(msg)
  console.log(match)

  if (msg.text.includes('/')) {
    bot.sendMessage(bot_chat_id, `Metadata cannot contain */* symbol. Try again.`)
    throw new Error('Unallowed character in metadata')
  }

  if (msg.text.includes('♂')) {
    bot.sendMessage(bot_chat_id, `Don't use *♂* in metadata.`, {
      parse_mode: 'Markdown'
    })
    throw new Error('Unallowed character in metadata')
  }

  if (video_id === undefined) {

    bot.sendMessage(bot_chat_id, 'Provide a link first')
    console.error(`[${ helper.getDate() }] No link`)

  } else {
    bot.sendMessage(bot_chat_id, helper.working_message)

    let url = 'https://www.youtube.com/watch?v=' + video_id

    let artist = match[1]
    let title = match[3]
    let metadata

    if (type_flag === 'gachi') {
      metadata = {
        artist: '♂ ' + artist,
        title: title + ' ♂',
        album: 'Gachimuchi'
      }
    } else {
      metadata = {
        artist: artist,
        title: title
      }
    }

    downloadAudio(url)
      .then(() => {

        let old_path = './tmp/' + video_id + '.mp3'
        let new_path = './tmp/' + artist + ' - ' + title + '.mp3'
        let attach = './tmp/' + video_id + '.jpg'

        fs.rename(old_path, new_path, () => {

          let options = {
            attachments: [attach]
          }

          ffmetadata.write(new_path, metadata, options, (err) => {
            if (err) throw err
            console.log(`[${ helper.getDate() }] Sending audio...`);

            type_flag === 'gachi' ? audioChatId = channel_id : audioChatId = msg.chat.id

            bot.sendMessage(audioChatId, url)
              .then(() => {

                bot.sendAudio(audioChatId, fs.createReadStream(new_path))
                  .catch((err) => {
                    console.log(err)
                    bot.sendMessage(chat_id, `*ERROR* ${ err.response.body.description }`, {
                      parse_mode: 'Markdown'
                    })
                  })
                  .then(() => {

                    deleteTempFiles(new_path, attach)
                    console.log(`[${ helper.getDate() }] Audio is delivered.`)
                    bot.deleteMessage(bot_chat_id, msg.message_id)
                    bot.deleteMessage(bot_chat_id, msg.message_id - 1)
                    bot.deleteMessage(bot_chat_id, msg.message_id - 2)
                    bot.deleteMessage(bot_chat_id, msg.message_id + 1)

                  })
              }).then(() => {

                if (type_flag === 'gachi') {
                  bot.sendMessage(bot_chat_id, 'Done.')
                }
                video_id = undefined
                type_flag = undefined
              })
          })
        })
      })
      .catch((e) => console.error(e))
  }
})