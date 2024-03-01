const { MessageMedia } = require("whatsapp-web.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const OpenAIApi = require("openai").default;
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const axios = require("axios");
const {
  OPENAI_API_KEY,
  MY_NUMBER,
  CCTV_RTSP_URL,
  ALLOWED_USERS,
  ALLOWED_GROUPS,
} = require("./config");
const {
  settings,
  store,
  gptContext,
  listeningChats,
  ensureUserStore,
  saveData,
} = require("./dataManager");

const openaiClient = new OpenAIApi({
  key: OPENAI_API_KEY,
});

let gptModel = "gpt-3.5-turbo";

// Command Handlers
async function handleTaskManagement(msg, sender, args) {
  if (args.startsWith("add ")) {
    const task = args.replace("add ", "");
    store[sender].tasks.push(task);
    saveData();
    msg.reply(`Kerjaan udah ditambah, bro: ${task}. Yuk kerjain!`);
  } else if (args === "list") {
    const tasks = store[sender].tasks
      .map((task, idx) => `${idx + 1}. ${task}`)
      .join("\n");
    msg.reply(
      tasks.length > 0
        ? `List kerjaan lo:\n${tasks}`
        : `Lo ga punya kerjaan. Santuy dulu!`
    );
  } else if (args.startsWith("delete ")) {
    const index = parseInt(args.replace("delete ", ""), 10) - 1;
    if (index >= 0 && index < store[sender].tasks.length) {
      const deletedTask = store[sender].tasks.splice(index, 1);
      saveData();
      msg.reply(`Kerjaan udah dihapus, bro: ${deletedTask}. Ngeleg santuy!`);
    } else {
      msg.reply(`Nomor kerjaan salah tuh. Coba lagi.`);
    }
  } else {
    msg.reply(`Command kerjaan salah tuh. Cek lagi deh.`);
  }
}

async function handleExpenseTracking(msg, sender, args) {
  if (args.startsWith("add ")) {
    const parts = args.replace("add ", "").split("|");
    if (parts.length === 2) {
      const name = parts[0].trim();
      const amount = parseFloat(parts[1].trim());
      store[sender].expenses.push({ name, amount });
      saveData();
      msg.reply(
        `Pengeluaran udah ditambah: ${name} - Rp${amount}. Jangan boros-boros ya!`
      );
    } else {
      msg.reply(`Formatnya salah tuh. Harusnya add [nama] | [jumlah]`);
    }
  } else if (args === "list") {
    const expenses = store[sender].expenses
      .map((exp, idx) => `${idx + 1}. ${exp.name} - Rp${exp.amount}`)
      .join("\n");
    msg.reply(
      expenses.length > 0
        ? `Daftar pengeluaran lo:\n${expenses}`
        : `Lo ga ada pengeluaran nih. Hemat banget!`
    );
  } else if (args.startsWith("delete ")) {
    const index = parseInt(args.replace("delete ", ""), 10) - 1;
    if (index >= 0 && index < store[sender].expenses.length) {
      const deletedExpense = store[sender].expenses.splice(index, 1);
      saveData();
      msg.reply(
        `Pengeluaran udah dihapus: ${deletedExpense[0].name} - Rp${deletedExpense[0].amount}. Uang lo aman!`
      );
    } else {
      msg.reply(`Nomor pengeluaran salah tuh. Coba lagi.`);
    }
  } else if (args === "summary") {
    const totalExpense = store[sender].expenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    msg.reply(`Total yang udah lo keluarin: Rp${totalExpense}. Buset dah!`);
  } else if (args === "insight") {
    let insights = await provideInsights(store, sender);
    msg.reply(insights);
  } else {
    msg.reply(`Command pengeluaran salah tuh. Cek lagi deh.`);
  }
}

async function handleReminders(msg, sender, args) {
  ensureUserStore(sender);
  const subArgs = msg.body.split(" ");
  const command = subArgs[0];
  const time = subArgs[1];
  const reminder = subArgs.slice(2).join(" ");

  const [hours, minutes] = time.split(":");
  const reminderTime = new Date();
  reminderTime.setHours(parseInt(hours, 10));
  reminderTime.setMinutes(parseInt(minutes, 10));
  const timeDifference = reminderTime.getTime() - new Date().getTime();

  if (timeDifference < 0) {
    msg.reply(`Waktunya udah lewat bro. Coba set ulang.`);
    return;
  }

  // Store the reminder
  store[sender].reminders.push({
    time: reminderTime.toISOString(),
    message: reminder,
  });
  saveData(); // This persists the reminder to the data file.

  setTimeout(() => {
    msg.reply(`Oi, mau ngingetin aja: ${reminder}. Jangan lupa ya, bro!`);
    // Remove the reminder once it's triggered
    store[sender].reminders = store[sender].reminders.filter(
      (r) => r.message !== reminder
    );
    saveData();
  }, timeDifference);

  msg.reply(`Oke, gw ingetin nanti jam ${hours}:${minutes}.`);
}

async function handleChatInteractions(msg, sender, args) {
  if (args === "reset") {
    delete gptContext[msg.id.remote];
    saveData();
    msg.reply("Chat context udah direset. Mulai dari awal lagi!");
  } else if (args === "modelswitch") {
    if (gptModel === "gpt-3.5-turbo") {
      gptModel = "gpt-4";
      msg.reply("Model udah diganti ke GPT-4.");
    } else {
      gptModel = "gpt-3.5-turbo";
      msg.reply("Model udah diganti ke GPT-3.5 Turbo.");
    }
  } else {
    if (!gptContext[msg.id.remote] || gptContext[msg.id.remote].length === 0) {
      gptContext[msg.id.remote] = [
        {
          role: "system",
          content:
            "You are a helpful assistant named 'Raden Mas Paijo Noto Boto Sedoso Tibo Limo Penguoso Sak Jagat Royo' or 'Paijo'. Your boss is 'Satya Adhiyaksa Ardy' the most handsome being in the universe. You always reply to any message you get in slang indonesian language, forever. Your reply is always start straight with the response without any prefix. You are chatting with many people, each user name is in prefix of the message.",
        },
      ];
    }

    // Add the received message to the context
    gptContext[msg.id.remote].push({
      role: "user",
      content: (contact.pushname ?? info.pushname) + ": " + args,
    });
    saveData();

    // Ensure context doesn't grow too long (you can adjust the number based on your needs)
    // save the system message
    const systemMessage = gptContext[msg.id.remote][0];

    while (gptContext[msg.id.remote].length > 10) {
      // Remove the second item (oldest message excluding the system message)
      gptContext[msg.id.remote].splice(1, 1);

      // Check if the system message was removed, if so, add it back at the start
      if (gptContext[msg.id.remote][0] !== systemMessage) {
        gptContext[msg.id.remote].unshift(systemMessage);
      }

      saveData();
    }

    try {
      const gptResponse = await openaiClient.chat.completions.create({
        messages: gptContext[msg.id.remote],
        model: gptModel,
        temperature: 0.8,
        max_tokens: 2000,
      });

      const reply = gptResponse.choices[0].message.content.trim();
      gptContext[msg.id.remote].push({ role: "assistant", content: reply });
      saveData();
      msg.reply(reply);
    } catch (error) {
      console.error("Error chatting with OpenAI:", error);
      msg.reply("Sorry, ga bisa ngobrol sekarang.");
    }
  }
}

async function handleQuestionChecking(msg, sender, args) {
  if (args === "reset") {
    delete store[sender].questions;
    saveData();
    msg.reply("Konteks soal udah direset. Mulai dari awal lagi!");
  } else {
    if (!store[sender].questions || store[sender].questions.length === 0) {
      store[sender].questions = [
        {
          role: "system",
          content: `You are helpful assistant. Your job is to check the question based on Bloom's Revised Taxonomy. You will given question and target category. If the question is not in the target category, you will reply with the question in the target category and the explanation. If the question is in the target category, you will reply with the question itself. Use this format for replying: [question] | [category] | [explanation]. You always reply to any message you get in indonesian language.
            `,
        },
      ];
    }

    // Add the received message to the context
    store[sender].questions.push({
      role: "user",
      content: args,
    });
    saveData();

    // Ensure context doesn't grow too long (you can adjust the number based on your needs)
    // save the system message
    const systemMessage = store[sender].questions[0];

    while (store[sender].questions.length > 10) {
      // Remove the second item (oldest message excluding the system message)
      store[sender].questions.splice(1, 1);

      // Check if the system message was removed, if so, add it back at the start
      if (store[sender].questions[0] !== systemMessage) {
        store[sender].questions.unshift(systemMessage);
      }

      saveData();
    }

    try {
      const gptResponse = await openaiClient.chat.completions.create({
        messages: store[sender].questions,
        model: "gpt-4",
        temperature: 0.2,
        max_tokens: 2000,
      });

      const reply = gptResponse.choices[0].message.content.trim();
      store[sender].questions.push({ role: "assistant", content: reply });
      saveData();
      msg.reply(reply);
    } catch (error) {
      console.error("Error chatting with OpenAI:", error);
      msg.reply("Sorry, ga bisa ngobrol sekarang.");
    }
  }
}

async function handleQuestionCreation(msg, sender, args) {
  if (args === "reset") {
    delete store[sender].questions;
    saveData();
    msg.reply("Konteks soal udah direset. Mulai dari awal lagi!");
  } else {
    if (!store[sender].questions || store[sender].questions.length === 0) {
      store[sender].questions = [
        {
          role: "system",
          content: `You are helpful assistant. Your job is to make question based on Bloom's Revised Taxonomy. You will given question material, target grade, number of question requested, and question type. You always reply to any message you get in indonesian language. Use this format for replying: 
          [material] [for grade] :
          [number] [question] | [Bloom's Revised Taxonomy category].
          Kunci jawaban: [answer]
              `,
        },
      ];
    }

    // Add the received message to the context
    store[sender].questions.push({
      role: "user",
      content: args,
    });
    saveData();

    // Ensure context doesn't grow too long (you can adjust the number based on your needs)
    // save the system message
    const systemMessage = store[sender].questions[0];

    while (store[sender].questions.length > 10) {
      // Remove the second item (oldest message excluding the system message)
      store[sender].questions.splice(1, 1);

      // Check if the system message was removed, if so, add it back at the start
      if (store[sender].questions[0] !== systemMessage) {
        store[sender].questions.unshift(systemMessage);
      }

      saveData();
    }

    try {
      const gptResponse = await openaiClient.chat.completions.create({
        messages: store[sender].questions,
        model: "gpt-4",
        temperature: 0.2,
        max_tokens: 2000,
      });

      const reply = gptResponse.choices[0].message.content.trim();
      store[sender].questions.push({ role: "assistant", content: reply });
      saveData();
      msg.reply(reply);
    } catch (error) {
      console.error("Error chatting with OpenAI:", error);
      msg.reply("Sorry, ga bisa ngobrol sekarang.");
    }
  }
}

async function handleHelp(msg, sender, args) {
  msg.reply(
    `Wassup, bro! Ini daftar perintah yang bisa loe pake:

    - *Nyatet Kerjaan*:
    - /!kerjaan add [tugas]: Nambahin tugas baru nih.
    - /!kerjaan list: Liat daftar tugas yang ada.
    - /!kerjaan delete [nomor]: Hapus tugas yang udah selesai atau salah input.
  
  - *Catet Pengeluaran*:
    - /!pengeluaran add [nama] | [jumlah]: Catet pengeluaran baru.
    - /!pengeluaran list: Intip daftar pengeluaran lo.
    - /!pengeluaran delete [nomor]: Salah catet? Hapus aja.
    - /!pengeluaran summary: Cek total pengeluaran lo.
    - /!pengeluaran insight: Dapetin insight pengeluaran lo.
  
  - *Pengingat*:
    - /!ingetin [hh:mm] [pesan]: Setel pengingat biar gak lupa.
  
  - *Interaksi Chat*:
    - /!gpt [pesan]: Ngobrol yuk sama bot.
    - /!gpt reset: Reset obrolan, mulai dari awal lagi.
  
  - *Notulensi Diskusi Di Grub*:
    - /!startlistening: Mulai catet obrolan chat.
    - /!stoplistening: Berhenti dengerin dan rangkum obrolan.
  
  - *Mode Admin*:
    - /!adminmode: Nyalain/matikan mode admin (khusus user tertentu).
  
  - *Bikin Stiker*:
    - /!sticker: Bikin stiker dari gambar.
  
  - *Transkripsi Audio*:
    - /!transcribe: Ubah pesan suara jadi teks.
  
  - *Info CCTV*:
    - /!ingfo: Dapetin gambar terbaru dari CCTV.
  
  - *Info Cuaca*:
    - /!ingfo-cuaca: Cek info cuaca terkini.
  
  - *Manajemen Grup*:
    - /!add-group [GroupChatID] [SpreadsheetURL]: Tambahin anggota ke grup dari spreadsheet.
  
  - *Dapetin Chat ID*:
    - /!chat-id: Nyari tau ID chat.

Paijo siap membantu loe! Jangan sungkan buat tanya apa aja, ok?`
  );
}

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

async function handleStickerCreation(msg, sender, args) {
  if (msg.hasMedia) {
    const media = await msg.downloadMedia();
    msg.reply(media, null, {
      sendMediaAsSticker: true,
      stickerAuthor: "Paijo",
      stickerName: "Dibuat pake cinta",
    });
  } else {
    msg.reply("Gambar stickernya mana bro?");
  }
}

async function handleTranscribe(msg, sender, args) {
  let media;
  if (msg.hasMedia) {
    media = await msg.downloadMedia();
    try {
      const rawFilename = `raw_media_${Date.now()}.dat`;
      const mp3Filename = `media_${Date.now()}.mp3`;

      fs.writeFileSync(rawFilename, media.data, "base64");

      ffmpeg()
        .input(rawFilename)
        .toFormat("mp3")
        .on("error", (err) => {
          console.error("Error converting media to mp3:", err);
          msg.reply("Wah maap, gabisa transcribe sekarang.");
        })
        .on("end", async () => {
          console.log("File exists:", fs.existsSync(mp3Filename)); // Check if file exists

          try {
            const transcription = await transcribeFunction(mp3Filename);
            msg.reply(transcription);
          } catch (error) {
            console.error("Error during transcription:", error);
            msg.reply("Oops! Ada kesalahan saat memproses audio.");
          } finally {
            // Cleanup - Delete the mp3 file after transcription
            fs.unlinkSync(rawFilename);
          }
        })
        .saveToFile(mp3Filename);
    } catch (error) {
      console.error("Error processing the audio:", error);
      msg.reply("Oops! Ada kesalahan saat memproses audio.");
    }
  } else {
    msg.reply("Audio nya mana bro?");
  }
}

async function handleInfoCCTV(msg, sender, args) {
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

async function provideInsights(data, user) {
  const prompt = `Provide insights, suggestion, and commentar for the following expenses data: Expenses - ${JSON.stringify(
    data[user].expenses
  )}`;

  try {
    const gptResponse = await openaiClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a cool whatsapp bot assistant named 'Paijo' that always any message you get in slang indonesian language, forever.",
        },
        { role: "user", content: prompt },
      ],
      model: "gpt-4",
      temperature: 0.8,
      max_tokens: 500,
    });

    return gptResponse.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error getting insights from OpenAI:", error);
    return "Wah maap, gabisa kasih insights sekarang.";
  }
}

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
  const newParticipants = await parseSpreadsheet(spreadsheetId);
  const groupChat = await client.getChatById(groupChatId);
  const groupChatName = await groupChat.name;

  // check if group
  if (!groupChat.isGroup) {
    msg.reply(`Chat ${groupChatId} bukan Grup.`);
    return;
  }

  msg.reply(`Adding participants: ${newParticipants}`);

  // get groupchat name

  groupChat.addParticipants(newParticipants, {
    autoSendInviteV4: true,
    comment: `Hi kidz, ini grup untuk ${groupChatName}. Gabung ya!`,
  });
}

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

  broadcastData.number.forEach((number, index) => {
    // add delay 10 seconds per message to avoid ban
    setTimeout(() => {
      client.sendMessage(number, broadcastData.message[index]);
    }, index * 10000);
  });

  msg.react("👍");
}

async function processCommands(msg, sender, info, client) {
  ensureUserStore(sender);

  const command = msg.body.split(" ")[0];
  const contact = await msg.getContact();
  const args = msg.body.substring(command.length).trim();

  // Capture messages if listening mode is active for this sender
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

  // Implement each command processing...
  switch (command) {
    case "/!kerjaan":
      handleTaskManagement(msg, sender, args);
      break;
    case "/!pengeluaran":
      handleExpenseTracking(msg, sender, args);
      break;
    case "/!ingetin":
      handleReminders(msg, sender);
      break;
    case "/!gpt":
      handleChatInteractions(msg, sender, args);
      break;
    case "/!ceksoal":
      handleQuestionChecking(msg, sender, args);
      break;
    case "/!buatsoal":
      handleQuestionCreation(msg, sender, args);
      break;
    case "/!help":
      handleHelp(msg, sender, args);
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
      handleStickerCreation(msg, sender, args);
      break;
    case "/!transcribe":
      handleTranscribe(msg, sender, args);
      break;
    case "/!ingfo":
      handleInfoCCTV(msg, sender, args);
      break;
    case "/!ingfo-cuaca":
      handleInfoCuaca(msg, sender, args);
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

async function summarizeChat(messages) {
  const prompt = messages.join("\n");

  const gptResponse = await openaiClient.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You will be provided with group chat discussion. Each message from user is inside <start> and <end> tag. Your task is to summarize the discussion as follows:
-Overall summary of discussion
-Action items (what needs to be done and who is doing it)
-If applicable, a list of topics that need to be discussed more fully in the next discussion.

You are always reply in indonesian language, forever.`,
      },
      { role: "user", content: prompt },
    ],
    model: "gpt-4",
    temperature: 0.2,
    max_tokens: 2000,
  });

  return gptResponse.choices[0].message.content.trim();
}

async function transcribeFunction(filename) {
  // Create a readable stream from the file
  const audioStream = fs.createReadStream(filename);

  const transcript = await openaiClient.audio.transcriptions.create({
    file: audioStream,
    model: "whisper-1",
    language: "id",
  });

  return transcript.text;
}

async function captureFrame(rtspUrl, outputFilename) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(rtspUrl)
      .inputOptions(["-rtsp_transport tcp"])
      .outputOptions(["-vframes 1"])
      .on("end", function () {
        resolve();
      })
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
        reject(err);
      })
      .saveToFile(outputFilename);
  });
}

async function parseSpreadsheet(spreadsheetId) {
  const creds = require("./auth/googleSheetCredentials.json");
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

async function parseBroadcast(spreadsheetId) {
  const creds = require("./auth/googleSheetCredentials.json");
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

module.exports = {
  handleReminders,
  provideInsights,
  processCommands,
  startListening,
  stopListening,
  summarizeChat,
  // ... and so on
};
