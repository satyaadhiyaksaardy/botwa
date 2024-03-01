const { summarizeChat } = require("../services/summarize");
const { listeningChats, saveData } = require("../utils/dataUtils");

async function startListening(chatId) {
  listeningChats[chatId] = [];
  saveData();
  return "Siyapp, mulai nyimak nih. Ntar ku kasih notulennya...";
}

async function stopListening(chatId) {
  const messages = listeningChats[chatId];
  const summary = await summarizeChat(messages);
  delete listeningChats[chatId];
  saveData();
  return summary;
}

module.exports = { startListening, stopListening };
