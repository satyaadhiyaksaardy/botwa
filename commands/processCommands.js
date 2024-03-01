const { handleTaskManagement } = require("../handlers/taskManagement");
const { handleExpenseTracking } = require("../handlers/expenseTracking");
const { handleReminders } = require("../handlers/reminders");
const { handleChatInteractions } = require("../handlers/chatInteractions");
const {
  handleQuestionChecking,
  handleQuestionCreation,
} = require("../handlers/questionManagement");
const { startListening, stopListening } = require("../handlers/listening");
const { handleAdminMode } = require("../handlers/adminMode");
const { handleStickerCreation } = require("../handlers/stickerCreation");
const { handleTranscription } = require("../handlers/transcription");
const { handleInfoCCTV } = require("../handlers/infoCCTV");
const { handleInfoCuaca } = require("../handlers/weatherInfo");
const { handleAddGroup } = require("../handlers/addGroup");
const { handleBroadcast } = require("../handlers/broadcast");
const { handleHelp } = require("../handlers/help");
const {
  ensureUserStore,
  settings,
  listeningChats,
} = require("../utils/dataUtils");

async function processCommands(msg, sender, info, client) {
  ensureUserStore(sender);
  const command = msg.body.split(" ")[0];
  const args = msg.body.substring(command.length).trim();
  const contact = await whatsappClient.getContactById(msg.from);

  if (listeningChats[msg.id.remote] && command !== "/!stoplistening") {
    listeningChats[msg.id.remote].push(
      `<start>${contact.pushname ?? sender}: ${msg.body}<end>`
    );
    saveData();
  }

  if (settings.isAdminMode) {
    if (msg.from === "status@broadcast" || !msg.fromMe) return;
  } else {
    if (msg.from === "status@broadcast") return;
  }

  console.log("Sender", contact.pushname ?? sender + ":", msg.body);

  // Routing commands to their handlers
  switch (command) {
    case "/!kerjaan":
      handleTaskManagement(msg, sender, args);
      break;
    case "/!pengeluaran":
      handleExpenseTracking(msg, sender, args);
      break;
    case "/!ingetin":
      handleReminders(msg, sender, args);
      break;
    case "/!gpt":
      handleChatInteractions(msg, sender, client);
      break;
    case "/!ceksoal":
      handleQuestionChecking(msg, sender, args);
      break;
    case "/!buatsoal":
      handleQuestionCreation(msg, sender, args);
      break;
    case "/!help":
      handleHelp(msg);
      break;
    case "/!startlistening":
      msg.reply(await startListening(msg.id.remote));
      break;
    case "/!stoplistening":
      msg.reply(await stopListening(msg.id.remote));
      break;
    case "/!adminmode":
      handleAdminMode(msg, sender, args);
      break;
    case "/!sticker":
      handleStickerCreation(msg);
      break;
    case "/!transcribe":
      handleTranscription(msg);
      break;
    case "/ingfo":
      handleInfoCCTV(msg, sender);
      break;
    case "/!ingfo-cuaca":
      handleInfoCuaca(msg, sender);
      break;
    case "/!chat-id":
      if (msg.to.includes("@g.us")) {
        msg.reply(`Chat ID: ${msg.to}`);
      } else {
        msg.reply(`Chat ID: ${msg.from}`);
      }
      break;
    case "/!add-group":
      handleAddGroup(msg, sender, args, client);
      break;
    case "/!broadcast":
      handleBroadcast(msg, sender, args, client);
      break;
    default:
      break;
  }
}

module.exports = { processCommands };
