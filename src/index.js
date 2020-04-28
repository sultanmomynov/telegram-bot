process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;
// Requirements
const TelegramBot = require('node-telegram-bot-api')
const config = require('config')
const ffmetadata = require('ffmetadata')
const fs = require('fs')
const getYoutubeId = require('get-youtube-id')
const chalk = require('chalk')
const readLastLines = require('read-last-lines');
const downloadAudio = require('./modules/youtubeDownloader')
const helper = require('./modules/helper')
const deleteTempFiles = require('./modules/deleteTempFiles')
const deleteMsgs = require('./modules/deleteMessages')

const token = config.get('token')
helper.logStart()

const bot = new TelegramBot(token, {
  polling: true,
  filepath: false
})

let videoId
let typeFlag

const admins = config.get('admins')
const channelId = config.get('channel_id')
const linksPath = `${ __dirname }/../misc/list.txt`

const YES_FLOW = 'yes'
const NO_FLOW = 'no'
const GACHI_FLOW = 'gachi'

bot.on('polling_error', (err) => {
  console.log(err.response.body.description)
})

// Messages logger
bot.on('message', msg => {
  console.log(chalk.cyan(`[${ helper.getDate() }] ${ helper.getEvent(msg) }`))
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
    match[1] === undefined ? numOfLines = 10 : numOfLines = match[1]
    readLastLines.read(`${ __dirname }/logs`, numOfLines)
      .then((lines) => {
        bot.sendMessage(chatId, `Showing last ${ numOfLines } log lines:\n\n${ lines }`, {
          disable_web_page_preview: true
        })
          .catch(() => {
            console.log(`[${ helper.getDate() }] Sending logfile...`)
            bot.sendDocument(chatId, fs.createReadStream(`${ __dirname }/logs`))
              .catch(err => console.log('ERROR: ', err))
              .then(() => {
                console.log(`[${ helper.getDate() }] Logfile is sent.`)
              })
          })
      })
  }
})

bot.onText(/\/random/, msg => {
  fs.readFile(linksPath, 'utf-8', (err, data) => {
    if (err) throw err
    const links = data.split('\n')
    const item = links[Math.floor(Math.random() * links.length)]
    bot.sendMessage(helper.getChatId(msg), item)
  })
})

bot.onText(/\/dl/, msg => {

  const chatId = helper.getChatId(msg)

  bot.sendMessage(chatId, helper.ask_link_message, {
    parse_mode: 'Markdown'
  })
})

bot.onText(/\/state/, msg => {

  const chatId = helper.getChatId(msg)

  bot.sendMessage(chatId, `${ videoId } : ${ typeFlag }`)
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

  console.log(chalk.cyan(`[${ helper.getDate() }] ${ helper.getEvent(query) }`))

  const chatId = helper.getChatId(query)

  switch (query.data) {

    case NO_FLOW: {
      const url = `https://www.youtube.com/watch?v=${ videoId }`
      bot.sendMessage(chatId, helper.working_message)

      downloadAudio(url)
        .then(() => {

          const path = `./tmp/${ videoId }.mp3`
          const attach = `./tmp/${ videoId }.jpg`

          console.log(`[${ helper.getDate() }] Sending audio...`);

          bot.sendAudio(chatId, fs.createReadStream(path))
            .catch((err) => {
              console.log(err)
              bot.sendMessage(chatId, `*ERROR* ${ err.response.body.description }`, {
                parse_mode: 'Markdown'
              })
            })
            .then(() => {
              deleteTempFiles(path, attach)
              deleteMsgs(NO_FLOW, bot, chatId, query)
              console.log(`[${ helper.getDate() }] Audio is sent.`)
              videoId = undefined
              typeFlag = undefined
            })
        })
        .catch((err) => {
          console.log(err)
          bot.sendMessage(chatId, err.stderr)
        })

      typeFlag = YES_FLOW
      break;
    }

    case YES_FLOW:
      bot.sendMessage(chatId, helper.send_tags_message, {
        parse_mode: 'Markdown'
      })
      typeFlag = YES_FLOW
      break;

    case GACHI_FLOW:
      fs.readFile(linksPath, 'utf-8', (err, data) => {
        if (err) throw err
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
          typeFlag = GACHI_FLOW
        }
      })
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
    console.log(`[${ helper.getDate() }] No link`)

  } else {
    bot.sendMessage(botChatId, helper.working_message)

    const url = `https://www.youtube.com/watch?v=${ videoId }`

    const artist = match[1]
    const title = match[3]
    let metadata

    if (typeFlag === GACHI_FLOW) {
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
            if (typeFlag === GACHI_FLOW) audioChatId = channelId
            else audioChatId = msg.chat.id

            bot.sendMessage(audioChatId, url)
              .then(() => {

                async function sendAudio() {
                  try {
                    console.log(typeFlag)
                    await bot.sendAudio(audioChatId, fs.createReadStream(newPath))
                    deleteTempFiles(newPath, artwork)
                    console.log(`[${ helper.getDate() }] Audio is sent.`)

                    if (typeFlag === GACHI_FLOW) {
                      deleteMsgs(GACHI_FLOW, bot, botChatId, msg)
                    }

                    if (typeFlag === YES_FLOW) {
                      deleteMsgs(YES_FLOW, bot, botChatId, msg)
                    }

                  } catch (error) {
                    console.log(error)
                    bot.sendMessage(audioChatId, `*ERROR* ${ error.response.body.description }`, {
                      parse_mode: 'Markdown'
                    })
                  }
                }

                sendAudio().then(() => {
                  if (typeFlag === GACHI_FLOW) {
                    fs.appendFileSync(linksPath, `${ url }\n`)
                    bot.sendMessage(botChatId, 'Done.')
                  }
                  videoId = undefined
                  typeFlag = undefined
                })

                //   bot.sendAudio(audioChatId, fs.createReadStream(newPath))
                //     .catch((error) => {
                //       console.log(error)
                //       bot.sendMessage(audioChatId, `*ERROR* ${ error.response.body.description }`, {
                //         parse_mode: 'Markdown'
                //       })
                //     })
                //     .then(() => {
                //       deleteTempFiles(newPath, artwork)
                //       console.log(`[${ helper.getDate() }] Audio is sent.`)
                //       if (typeFlag === GACHI_FLOW) {
                //         deleteMsgs(GACHI_FLOW, bot, botChatId, msg)
                //       }
                //       if (typeFlag === YES_FLOW) {
                //         deleteMsgs(YES_FLOW, bot, botChatId, msg)
                //       }

                //     })

                // }).then(() => {
                //   if (typeFlag === GACHI_FLOW) {
                //     fs.appendFileSync(linksPath, `${ url }\n`)
                //     bot.sendMessage(botChatId, 'Done.')
                //   }
                // videoId = undefined
                // typeFlag = undefined
              })
          })
        })
      })
      .catch((e) => {
        console.log(e)
        bot.sendMessage(botChatId, e)
      })
  }
})