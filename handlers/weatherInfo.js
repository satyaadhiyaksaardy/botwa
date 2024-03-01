const axios = require("axios");
const fs = require("fs");
const { MessageMedia } = require("whatsapp-web.js");

async function handleInfoCuaca(msg, sender, args) {
  const apiUrl =
    "https://ss.satyaadhiyaksa.com/screenshot?url=http://sipora.staklimyogyakarta.com/radar/";
  const weatherOutputFile = "weather.png";

  msg.react("⏳");

  // Make a GET request to the API endpoint
  axios
    .get(apiUrl, { responseType: "arraybuffer" })
    .then((response) => {
      // Save the image to a file
      fs.writeFileSync(weatherOutputFile, Buffer.from(response.data, "binary"));
      console.log("Image saved to:", weatherOutputFile);
      msg.reply(MessageMedia.fromFilePath(weatherOutputFile), null, {
        caption: "Cuacanya gini nih bang",
      });

      // Delete the image file
      fs.unlinkSync(weatherOutputFile);

      msg.react("👍");
    })
    .catch((error) => {
      msg.reply("Wah maap, gabisa ngasih ingfo cuaca sekarang");
      console.error("Error fetching image from API:", error);

      msg.react("❌");
    });
}

module.exports = { handleInfoCuaca };
