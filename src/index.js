process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

const TelegramBot = require('node-telegram-bot-api')
const config = require('config')
const fs = require('fs')
const getYoutubeId = require('get-youtube-id')
const chalk = require('chalk')
const downloadAudio = require('./modules/youtubeDownloader')
const helper = require('./modules/helper')
const deleteTempFiles = require('./modules/deleteTempFiles')
const deleteMsgs = require('./modules/deleteMessages')
const applyMetadata = require('./modules/applyMetadata')
const logger = require('./modules/logger')

const TOKEN = config.get('token')
helper.logStart()

const bot = new TelegramBot(TOKEN, {
  polling: true,
  filepath: false
})

let videoId, type

const admins = config.get('admins')
const channelId = config.get('channel_id')
const linksPath = `${ __dirname }/../misc/list.txt`

const YES_FLOW = 'yes'
const NO_FLOW = 'no'
const GACHI_FLOW = 'gachi'

bot.on('polling_error', (err) => {
  err.response === undefined ? console.log(err) : console.log(err.response.body.description)
})

// Messages logger
bot.on('message', msg => {
  logger.logUserMessage(helper.getEvent(msg))
  console.log(`[${ helper.getDate() }] ${ helper.getEvent(msg) }`)
})

bot.onText(/\/ulogs( \d+)?/, (msg, match) => {
  if (!admins.includes(msg.from.id)) return
  logger.sendLogs(bot, msg, match, 'userlogs')
})

bot.onText(/\/logs( \d+)?/, (msg, match) => {
  if (!admins.includes(msg.from.id)) return
  logger.sendLogs(bot, msg, match, 'logs')
})

bot.onText(/\/start/, msg => {
  bot.sendMessage(helper.getChatId(msg), helper.greet(msg), {
    parse_mode: 'Markdown'
  })
})

bot.onText(/\/random/, msg => {
  const data = fs.readFileSync(linksPath, 'utf-8')
  const links = data.split('\n')
  const item = links[Math.floor(Math.random() * links.length)]
  bot.sendMessage(helper.getChatId(msg), item)
})

bot.onText(/\/dl/, msg => {
  const chatId = helper.getChatId(msg)
  bot.sendMessage(chatId, helper.ask_link_message, {
    parse_mode: 'Markdown'
  })
})

bot.onText(/\/state/, msg => {
  const chatId = helper.getChatId(msg)
  bot.sendMessage(chatId, `${ videoId } : ${ type }`)
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

  const chatId = helper.getChatId(query)
  console.log(chalk.cyan(`[${ helper.getDate() }] ${ helper.getEvent(query) }`))

  switch (query.data) {
    case NO_FLOW: {
      (async function main() {
        try {
          const url = `https://www.youtube.com/watch?v=${ videoId }`
          await bot.sendMessage(chatId, helper.working_message)
          await downloadAudio(url)
          const path = `./tmp/${ videoId }.mp3`
          const attach = `./tmp/${ videoId }.jpg`
          console.log(`[${ helper.getDate() }] Sending audio...`)
          await bot.sendAudio(chatId, fs.createReadStream(path))
          deleteTempFiles(path, attach)
          await deleteMsgs(bot, chatId, query, NO_FLOW)
          console.log(`[${ helper.getDate() }] Audio is sent.`)
          videoId = undefined
          type = undefined
        } catch (e) {
          console.log("ERROR", e)
          bot.sendMessage(chatId, 'Error occured. Please, try again.', {
            parse_mode: 'Markdown'
          })
        }
      })()
      break
    }

    case YES_FLOW:
      bot.sendMessage(chatId, helper.send_tags_message, {
        parse_mode: 'Markdown'
      })
      type = YES_FLOW
      break

    case GACHI_FLOW: {
      const data = fs.readFileSync(linksPath, 'utf-8')
      const links = data.split('\n')
      const url = `https://www.youtube.com/watch?v=${ videoId }`
      if (links.includes(url)) {
        bot.deleteMessage(chatId, query.message.message_id)
        bot.sendMessage(chatId, helper.entry_exists_message)
        videoId = undefined
      } else {
        bot.sendMessage(chatId, helper.send_gachi_tags_message, {
          parse_mode: 'Markdown'
        })
        type = GACHI_FLOW
      }
      break
    }

    default:
    // nothing
  }
})

bot.onText(/^(.*) (-|–) (.*)$/, (msg, match) => {
  const botChatId = helper.getChatId(msg)

  if (msg.text.includes('/')) {
    bot.sendMessage(botChatId, `Don't use *"/"* in metadata.`, {
      parse_mode: 'Markdown'
    })
    console.log(`[${ helper.getDate() }] ERROR: Unallowed character in metadata`);
    return
  }

  if (msg.text.includes('♂')) {
    bot.sendMessage(botChatId, `Don't use *"♂"* in metadata.`, {
      parse_mode: 'Markdown'
    })
    console.log(`[${ helper.getDate() }] ERROR: Unallowed character in metadata`);
    return
  }

  if (videoId === undefined) {
    bot.sendMessage(botChatId, 'Provide a link first')
    console.log(`[${ helper.getDate() }] ERROR: No link provided`)
    return
  }

  (async function main() {
    try {
      await bot.sendMessage(botChatId, helper.working_message)
      const url = `https://www.youtube.com/watch?v=${ videoId }`
      const artist = match[1]
      const title = match[3]

      const GACHI_METADATA = {
        artist: `♂ ${ artist }`,
        title: `${ title } ♂`,
        album: 'Gachimuchi'
      }

      const NORMAL_METADATA = {
        artist,
        title
      }

      const metadata = type === GACHI_FLOW ? GACHI_METADATA : NORMAL_METADATA
      await downloadAudio(url)
      const oldPath = `./tmp/${ videoId }.mp3`
      const newPath = `./tmp/${ artist } - ${ title }.mp3`
      const artwork = `./tmp/${ videoId }.jpg`
      fs.renameSync(oldPath, newPath)

      const options = { attachments: [artwork] }
      await applyMetadata(newPath, metadata, options)
      console.log(`[${ helper.getDate() }] Sending audio...`);
      const audioChatId = type === GACHI_FLOW ? channelId : msg.chat.id
      if (type === GACHI_FLOW) await bot.sendMessage(audioChatId, url)

      await bot.sendAudio(audioChatId, fs.createReadStream(newPath))
      deleteTempFiles(newPath, artwork)
      console.log(`[${ helper.getDate() }] Audio is sent.`)
      if (type === GACHI_FLOW) {
        fs.appendFileSync(linksPath, `${ url }\n`)
        await bot.sendMessage(botChatId, 'Done.')
      }
      await deleteMsgs(bot, botChatId, msg)
      videoId = undefined
      type = undefined
    } catch (e) {
      console.log("ERROR", e)
      bot.sendMessage(botChatId, 'Error occured. Please, try again.')
    }
  })()
})
