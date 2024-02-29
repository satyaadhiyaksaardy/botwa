const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { MY_NUMBER } = require("./config");
const { processCommands } = require("./commandsProcessor");

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
  const client = whatsappClient;
  await processCommands(msg, msg.from, info, client);
});

whatsappClient.on("message_revoke_everyone", async (after, before) => {
  if (after.from === "status@broadcast") return;

  if (before) {
    whatsappClient.sendMessage(
      MY_NUMBER,
      `Message deleted in chat *${whatsappClient.info.pushname}*

Original message in chat : 
${before.body}`
    );
  }
});

whatsappClient.initialize();
