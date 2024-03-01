const fs = require("fs");
const { MessageMedia } = require("whatsapp-web.js");
const { ALLOWED_USERS, ALLOWED_GROUPS, CCTV_RTSP_URL } = require("../config");

async function handleInfoCCTV(msg, sender) {
  const isAllowedUser = ALLOWED_USERS.includes(sender);
  const isAllowedGroup = ALLOWED_GROUPS.includes(sender);

  if (isAllowedUser || isAllowedGroup) {
    msg.react("⏳");

    try {
      await captureFrame(CCTV_RTSP_URL, "ingfo-u.jpg");

      const scu = MessageMedia.fromFilePath("./ingfo-u.jpg");

      msg.reply(scu, null, {
        caption: "Ingfonya bang.",
      });

      msg.react("👍");

      //delete the file
      fs.unlinkSync("./ingfo-u.jpg");
    } catch (error) {
      msg.react("❌");
    }
  } else {
    msg.reply("Disini gabisa bwang, gadikasih akses.");
  }
}

module.exports = { handleInfoCCTV };
