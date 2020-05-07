const fs = require('fs')
const readLastLines = require('read-last-lines')
const helper = require('../modules/helper')

module.exports = {
  logUserMessage(event) {
    const logMessage = `[${ helper.getDate() }] ${ event }\n`
    fs.appendFile(`${ __dirname }/../userlogs`, logMessage, (err) => {
      if (err) throw err;
    });
  },
  sendLogs(bot, msg, match, logfile) {
    const logpath = `${__dirname}/../logs/${logfile}.txt`
    const chatId = helper.getChatId(msg)
    const numOfLines = match[1] === undefined ? 10 : match[1]
    readLastLines.read(logpath, numOfLines)
    .then((lines) => {
      bot.sendMessage(chatId, `Showing last ${ numOfLines } log lines:\n\n${ lines }`, {
        disable_web_page_preview: true
      })
      .catch((err) => {
        if (err.response.body.description === 'Bad Request: message is too long') {
          console.log(`[${ helper.getDate() }] Message is too long, sending logfile...`)
        } else {
          console.log('ERROR', err)
        }
        bot.sendDocument(chatId, fs.createReadStream(logpath))
        .catch(err => console.log('ERROR: ', err))
        .then(() => {
          console.log(`[${ helper.getDate() }] Logfile is sent.`)
        })
      })
    })
  }
}