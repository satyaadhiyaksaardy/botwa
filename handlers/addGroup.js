const { MY_NUMBER } = require("../config");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

async function handleAddGroup(msg, sender, args, client) {
  const groupChatId = args.split(" ")[0];
  const spreadsheetUrl = args.split(" ")[1];

  if (sender !== MY_NUMBER) {
    msg.reply("Kamu gapunya akses buat nambahin anggota ke grup bwang.");
    return;
  }

  // Parse the Google Sheet ID from the URL
  const parts = spreadsheetUrl.split("/");
  const spreadsheetIdIndex = parts.findIndex((part) => part === "d") + 1;
  const spreadsheetId = parts[spreadsheetIdIndex];
  const newParticipants = await parseParticipants(spreadsheetId);
  const groupChat = await client.getChatById(groupChatId);
  const groupChatName = await groupChat.name;

  // check if group
  if (!groupChat.isGroup) {
    msg.reply(`Chat ${groupChatId} bukan Grup.`);
    return;
  }

  msg.reply(`Adding participants: ${newParticipants}`);

  groupChat.addParticipants(newParticipants, {
    autoSendInviteV4: true,
    comment: `Halo, ini grup untuk ${groupChatName}. Gabung ya!`,
  });
}

async function parseParticipants(spreadsheetId) {
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
  let newParticipants = [];
  for (let i = 0; i < rows.length; i++) {
    newParticipants.push(rows[i].get("No. WA") + "@c.us");
  }
  return newParticipants;
}

module.exports = { handleAddGroup };
