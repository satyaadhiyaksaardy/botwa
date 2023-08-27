const { Client, LocalAuth } = require("whatsapp-web.js");
// const Qrcode = require("qrcode-terminal");
const { MY_NUMBER } = require("./config");
const { loadData } = require("./dataManager");
const { processCommands } = require("./commandsProcessor");

const whatsappClient = initializeWhatsAppClient();

// Initialization of WhatsApp client and event listeners will go here.
function initializeWhatsAppClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ["--no-sandbox"], headless: true },
  });
  client.initialize();
  return client;
}

// Event listeners
whatsappClient.on("loading_screen", (percent, message) => {
  console.log("LOADING SCREEN", percent, message);
});

// whatsappClient.on("qr", (qr) => {
//   Qrcode.generate(qr, { small: true });
// });

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
  if (msg.from === "status@broadcast" || msg.hasQuotedMsg) return;
  // if (msg.from === "status@broadcast" || msg.hasQuotedMsg || !msg.fromMe)
  await processCommands(msg, msg.from);
});

whatsappClient.on("message_revoke_everyone", async (after, before) => {
  if (after.from === "status@broadcast" || after.hasQuotedMsg) return;

  client.sendMessage(
    MY_NUMBER,
    `Message deleted in chat ${after.from}: ${after.body}`
  );
  if (before) {
    client.sendMessage(
      MY_NUMBER,
      `Original message in chat ${before.from}: ${before.body}`
    );
  }
});
