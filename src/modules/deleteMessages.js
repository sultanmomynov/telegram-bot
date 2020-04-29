module.exports = async function deleteMsgs(bot, chatId, msg, type = null) {
  switch (type) {
    case 'no':
      await bot.deleteMessage(chatId, msg.message.message_id)
      await bot.deleteMessage(chatId, msg.message.message_id + 1)
      break

    default:
      await bot.deleteMessage(chatId, msg.message_id - 2)
      await bot.deleteMessage(chatId, msg.message_id - 1)
      await bot.deleteMessage(chatId, msg.message_id)
      await bot.deleteMessage(chatId, msg.message_id + 1)
      break
  }
}