process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;
// Requirements
const TelegramBot = require('node-telegram-bot-api')
const config = require('config')

const token = config.get('token')
const ffmetadata = require('ffmetadata')
const fs = require('fs')
const getYoutubeId = require('get-youtube-id')
const chalk = require('chalk')
const readLastLines = require('read-last-lines');
const downloadAudio = require('./modules/youtubeDownloader')
const helper = require('./modules/helper')
// const logger = require('./modules/logger')
const deleteTempFiles = require('./modules/deleteTempFiles')

const linksArray = fs.readFileSync(`${ __dirname }/../misc/list.txt`).toString().split("\n");

helper.logStart()

const bot = new TelegramBot(token, {
  polling: true,
  filepath: false
})

let videoId
let typeFlag

const admins = config.get('admins')
const channelId = config.get('channel_id')

bot.on('polling_error', (msg) => {
  console.log(msg);
})

// Messages logger
bot.on('message', msg => {
  const event = `${ msg.from.username }: ${ msg.text }`
  console.log(chalk.cyan(`[${ helper.getDate() }] ${ event }`))
  // logger.log(event)
})

bot.onText(/\/start/, msg => {
  bot.sendMessage(helper.getChatId(msg), helper.greet(msg), {
    parse_mode: 'Markdown'
  })
})

bot.onText(/\/logs( \d+)?/, (msg, match) => {
  const chatId = helper.getChatId(msg)

  if (admins.includes(msg.from.id)) {
    let numOfLines
    if (match[1] !== undefined) numOfLines = match[1]
    numOfLines = 10
    readLastLines.read(`${ __dirname }/logs`, numOfLines)
      .then((lines) => {
        bot.sendMessage(chatId, `Showing last ${ numOfLines } log lines:\n\n${ lines }`, {
          disable_web_page_preview: true
        })
          .catch(err => {
            console.log(err.response.body.description)
            bot.sendMessage(chatId, `*ERROR* ${ err.response.body.description }`, {
              parse_mode: 'Markdown'
            })
          })
      })
  }
})

bot.onText(/\/random/, msg => {
  const item = linksArray[Math.floor(Math.random() * linksArray.length)]
  bot.sendMessage(helper.getChatId(msg), item)
})

bot.onText(/\/dl/, msg => {

  const chatId = helper.getChatId(msg)

  bot.sendMessage(chatId, helper.ask_link_message, {
    parse_mode: 'Markdown'
  })
})

bot.onText(/https?(.+)/, msg => {
  videoId = getYoutubeId(msg.text)

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

  const event = `${ query.message.chat.username }: ${ query.data } (callback_query)`
  console.log(chalk.cyan(`[${ helper.getDate() }] ${ event }`))
  // logger.log(event)

  const chatId = helper.getChatId(query)

  switch (query.data) {

    case 'no': {
      const url = `https://www.youtube.com/watch?v=${ videoId }`
      bot.sendMessage(chatId, helper.working_message)

      downloadAudio(url)
        .then(() => {

          const path = `./tmp/${ videoId }.mp3`
          const attach = `./tmp/${ videoId }.jpg`

          bot.sendAudio(chatId, fs.createReadStream(path))
            .catch((err) => {
              console.log(err)
              bot.sendMessage(chatId, `*ERROR* ${ err.response.body.description }`, {
                parse_mode: 'Markdown'
              })
            })
            .then(() => {
              deleteTempFiles(path, attach)
              bot.deleteMessage(chatId, query.message.message_id)
              bot.deleteMessage(chatId, query.message.message_id + 1)
              console.log(`[${ helper.getDate() }] Audio is delivered.`)
              videoId = undefined
              typeFlag = undefined
            })
        })
        .catch((err) => console.error(err))

      typeFlag = 'normal'
      break;
    }

    case 'yes':
      bot.sendMessage(chatId, helper.send_tags_message, {
        parse_mode: 'Markdown'
      })
      typeFlag = 'normal'
      break;

    case 'gachi':
      bot.sendMessage(chatId, helper.send_gachi_tags_message, {
        parse_mode: 'Markdown'
      })
      typeFlag = 'gachi'
      break;

    default:
    // nothing
  }
})

bot.onText(/^(.*) (-|–) (.*)$/, (msg, match) => {

  const botChatId = helper.getChatId(msg)

  if (msg.text.includes('/')) {
    bot.sendMessage(botChatId, `Metadata cannot contain */* symbol. Try again.`)
    throw new Error('Unallowed character in metadata')
  }

  if (msg.text.includes('♂')) {
    bot.sendMessage(botChatId, `Don't use *♂* in metadata.`, {
      parse_mode: 'Markdown'
    })
    throw new Error('Unallowed character in metadata')
  }

  if (videoId === undefined) {

    bot.sendMessage(botChatId, 'Provide a link first')
    console.error(`[${ helper.getDate() }] No link`)

  } else {
    bot.sendMessage(botChatId, helper.working_message)

    const url = `https://www.youtube.com/watch?v=${ videoId }`

    const artist = match[1]
    const title = match[3]
    let metadata

    if (typeFlag === 'gachi') {
      metadata = {
        artist: `♂ ${ artist }`,
        title: `${ title } ♂`,
        album: 'Gachimuchi'
      }
    } else {
      metadata = {
        artist,
        title
      }
    }

    downloadAudio(url)
      .then(() => {

        const oldPath = `./tmp/${ videoId }.mp3`
        const newPath = `./tmp/${ artist } - ${ title }.mp3`
        const artwork = `./tmp/${ videoId }.jpg`

        fs.rename(oldPath, newPath, () => {

          const options = { attachments: [artwork] }

          ffmetadata.write(newPath, metadata, options, (err) => {
            if (err) throw err
            console.log(`[${ helper.getDate() }] Sending audio...`);

            let audioChatId
            if (typeFlag === 'gachi') audioChatId = channelId
            audioChatId = msg.chat.id

            bot.sendMessage(audioChatId, url)
              .then(() => {

                bot.sendAudio(audioChatId, fs.createReadStream(newPath))
                  .catch((error) => {
                    console.log(error)
                    bot.sendMessage(audioChatId, `*ERROR* ${ error.response.body.description }`, {
                      parse_mode: 'Markdown'
                    })
                  })
                  .then(() => {

                    deleteTempFiles(newPath, artwork)
                    console.log(`[${ helper.getDate() }] Audio is delivered.`)
                    bot.deleteMessage(botChatId, msg.message_id)
                    bot.deleteMessage(botChatId, msg.message_id - 1)
                    bot.deleteMessage(botChatId, msg.message_id - 2)
                    bot.deleteMessage(botChatId, msg.message_id + 1)

                  })
              }).then(() => {

                if (typeFlag === 'gachi') {
                  bot.sendMessage(botChatId, 'Done.')
                }
                videoId = undefined
                typeFlag = undefined
              })
          })
        })
      })
      .catch((e) => console.error(e))
  }
})