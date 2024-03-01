const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const { MessageMedia } = require("whatsapp-web.js");
const { MY_NUMBER } = require("../config");

async function handleBroadcast(msg, sender, args, client) {
  const spreadsheetUrl = args;

  if (sender !== MY_NUMBER) {
    msg.reply("Kamu gapunya akses buat broadcast bwang.");
    return;
  }

  // Parse the Google Sheet ID from the URL
  const parts = spreadsheetUrl.split("/");
  const spreadsheetIdIndex = parts.findIndex((part) => part === "d") + 1;
  const spreadsheetId = parts[spreadsheetIdIndex];
  const broadcastData = await parseBroadcast(spreadsheetId);

  msg.react("⏳");

  // add delay random 5-15 seconds per message to avoid ban
  for (let i = 0; i < broadcastData.number.length; i++) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 10000 + 5000)
    );
    client.sendMessage(broadcastData.number[i], broadcastData.message[i]);
  }

  msg.react("👍");
}

async function parseBroadcast(spreadsheetId) {
  const creds = require("../auth/googleSheetCredentials.json");
  const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ];

  const jwt = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SCOPES,
  });
  const doc = new GoogleSpreadsheet(spreadsheetId, jwt);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  let broadcastData = {
    number: [],
    message: [],
  };
  for (let i = 0; i < rows.length; i++) {
    broadcastData.number.push(rows[i].get("No. WA") + "@c.us");
    broadcastData.message.push(rows[i].get("Message"));
  }
  return broadcastData;
}

module.exports = { handleBroadcast };
