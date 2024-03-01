const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { MY_NUMBER } = require("./config");
const { processCommands } = require("./commands/processCommands");

const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ["--no-sandbox"], headless: true },
});

// Event listeners
whatsappClient.on("loading_screen", (percent, message) => {
  console.log("LOADING SCREEN", percent, message);
});

whatsappClient.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

whatsappClient.on("authenticated", () => {
  console.log("AUTHENTICATED");
});

whatsappClient.on("auth_failure", (msg) => {
  console.error("AUTHENTICATION FAILURE", msg);
});

whatsappClient.on("ready", () => {
  console.log("READY");
});

whatsappClient.on("message_create", async (msg) => {
  const info = whatsappClient.info;
  const sender = msg.from;
  await processCommands(msg, sender, info, whatsappClient);
});

whatsappClient.on("message_revoke_everyone", async (after, before) => {
  if (after.from === "status@broadcast") return;

  // Notify the user that a message was deleted from where it was sent and send the original message to the admin. get from contact name or if group, get from group name
  const contact = await whatsappClient.getContactById(before.from);
  const sender = contact.pushname ?? before.from;
  const message = before.body;
  const chatId = before.chatId._serialized;
  const chat = await whatsappClient.getChatById(chatId);
  const chatName = chat.isGroup ? chat.name : sender;

  const originalMessage = `Pesan dari ${chatName} dihapus: ${message} (dari ${sender})`;
  whatsappClient.sendMessage(MY_NUMBER, originalMessage);
});

whatsappClient.initialize();
