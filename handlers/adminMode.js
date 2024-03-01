const { settings, saveData } = require("../utils/dataUtils");
const { MY_NUMBER } = require("../config");

async function handleAdminMode(msg, sender, args) {
  if (sender === MY_NUMBER) {
    if (settings.isAdminMode) {
      settings.isAdminMode = false;
      msg.reply("Admin mode udah dimatikan.");
    } else {
      settings.isAdminMode = true;
      msg.reply("Admin mode udah dinyalain.");
    }
    saveData();
  } else {
    msg.reply("Loe bukan Bos gua Bro, jangan nyuruh nyuruh");
  }
}

module.exports = { handleAdminMode };
