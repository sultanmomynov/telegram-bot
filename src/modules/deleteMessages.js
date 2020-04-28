module.exports = async function deleteMsgs(type, bot, chatId, msg) {
  switch (type) {
    case 'yes':
      await bot.deleteMessage(chatId, msg.message_id - 2)
      await bot.deleteMessage(chatId, msg.message_id - 1)
      await bot.deleteMessage(chatId, msg.message_id)
      await bot.deleteMessage(chatId, msg.message_id + 1)
      await bot.deleteMessage(chatId, msg.message_id + 2)
      break

    case 'no':
      await bot.deleteMessage(chatId, msg.message.message_id)
      await bot.deleteMessage(chatId, msg.message.message_id + 1)
      break

    case 'gachi':
      await bot.deleteMessage(chatId, msg.message_id - 2)
      await bot.deleteMessage(chatId, msg.message_id - 1)
      await bot.deleteMessage(chatId, msg.message_id)
      await bot.deleteMessage(chatId, msg.message_id + 1)
      break

    default:
    // nothing
  }
}