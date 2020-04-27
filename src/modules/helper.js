module.exports = {
  debug(obj = null) {
    return JSON.stringify(obj, null, 4)
  },
  logStart() {
    console.clear()
    console.log('Bot has been started..')
  },
  getChatId(obj) {
    if (obj.data === undefined) return obj.chat.id
    return obj.message.chat.id
  },
  getDate() {
    return new Date().toLocaleString()
  },
  getEvent(obj) {
    return obj.data === undefined ? `${ obj.from.username } (${ obj.from.first_name }): ${ obj.text }` : `${ obj.message.chat.username } (${ obj.from.first_name }): ${ obj.data } (callback_query)`
  },
  working_message: 'Sending file..',
  ask_link_message: `Give me a YouTube link.\nYou can write *@vid* to find video\nExample: *@vid Coldplay*`,
  ask_tags_message: `Need custom meta tags?`,
  send_tags_message: `Send me song metadata.\nFormat: *Artist* - *Title*\nExample: *Dua Lipa - New Rules*`,
  send_gachi_tags_message: `Hey buddy, i think you got the wrong door the leather club is two blocks down\n\nSend me metadata (format: _artist - title_)\n\n*Requirements:*\n1. Don't use *♂* in metadata.\n2. Be creative gachiBASS\n\n*GOOD*\n_БИ-2 - Полковнику никто не fisting ass_\n\n*BAD*\n_♂ БИ-2 - Полковнику никто не fisting ass ♂_`,
  greet(message) {
    const greetings = `Hello, *${ message.from.first_name }*\nI can convert YouTube videos to audio\nJust write */dl*`
    return greetings
  },
  admin_inline_keyboard: [
    [
      {
        text: "Yes",
        callback_data: 'yes'
      },
      {
        text: "No",
        callback_data: 'no'
      }
    ],
    [
      {
        text: "Gachimuchi (for group)",
        callback_data: 'gachi'
      }
    ]
  ],
  usual_inline_keyboard: [
    [
      {
        text: "Yes",
        callback_data: 'yes'
      },
      {
        text: "No",
        callback_data: 'no'
      }
    ]
  ]
}