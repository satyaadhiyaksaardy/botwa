const OpenAIApi = require("openai").default;
const dotenv = require("dotenv");
const fs = require("fs");
const { Client, Qrcode, LocalAuth } = require("./index");

dotenv.config();

const { MY_NUMBER, DATA_FILE, OPENAI_API_KEY } = process.env;

let gptContext = {};

// Initialize clients and data
const whatsappClient = initializeWhatsAppClient();
const openaiClient = new OpenAIApi({
  key: OPENAI_API_KEY,
  organization: "org-ievih6LsBjEbJfmo2FA0CEbP",
});
let store = loadData();

function initializeWhatsAppClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ["--no-sandbox"], headless: true },
  });
  client.initialize();
  return client;
}

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (data.gptContext) {
      gptContext = data.gptContext;
    }
    return data.store || {};
  }
  return {};
}

function saveData() {
  const fullData = {
    store: store,
    gptContext: gptContext,
  };
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(fullData, null, 4), "utf-8");
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

function ensureUserStore(user) {
  if (!store[user]) {
    store[user] = { tasks: [], expenses: [], reminders: [] };
  }
}

async function processReminders(msg, sender) {
  ensureUserStore(sender);
  const args = msg.body.split(" ");
  const command = args[0];
  const time = args[1];
  const reminder = args.slice(2).join(" ");

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
    msg.reply(`Oi, ingetin aja: ${reminder}. Jangan lupa ya, bro!`);
    // Remove the reminder once it's triggered
    store[sender].reminders = store[sender].reminders.filter(
      (r) => r.message !== reminder
    );
    saveData();
  }, timeDifference);

  msg.reply(`Oke, gw ingetin nanti jam ${hours}:${minutes}.`);
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
      model: "gpt-3.5-turbo",
      temperature: 0.8,
      max_tokens: 500,
    });

    return gptResponse.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error getting insights from OpenAI:", error);
    return "Sorry, unable to provide insights at the moment.";
  }
}

async function processCommands(msg, sender) {
  ensureUserStore(sender);
  const command = msg.body.split(" ")[0];
  const args = msg.body.substring(command.length).trim();

  // Implement each command processing...
  switch (command) {
    case "/!kerjaan":
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
          msg.reply(
            `Kerjaan udah dihapus, bro: ${deletedTask}. Ngeleg santuy!`
          );
        } else {
          msg.reply(`Nomor kerjaan salah tuh. Coba lagi.`);
        }
      } else {
        msg.reply(`Command kerjaan salah tuh. Cek lagi deh.`);
      }
      break;
    case "/!pengeluaran":
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
      break;
    case "/!ingetin":
      processReminders(msg, sender);
      break;
    case "/!gpt":
      if (args === "reset") {
        delete gptContext[sender];
        saveData();
        msg.reply("Chat context udah direset. Mulai dari awal lagi!");
      } else {
        if (!gptContext[sender]) {
          gptContext[sender] = [];
        }

        // Add the received message to the context
        gptContext[sender].push({
          role: "system",
          content:
            "You are a helpful assistant named 'Paijo'. You always reply to any message you get in slang indonesian language, forever.",
        });
        gptContext[sender].push({ role: "user", content: msg.body });

        // Ensure context doesn't grow too long (you can adjust the number based on your needs)
        if (gptContext[sender].length > 5) {
          gptContext[sender].shift(); // remove the oldest message
        }

        try {
          const gptResponse = await openaiClient.chat.completions.create({
            messages: gptContext[sender],
            model: "gpt-3.5-turbo",
            temperature: 0.8,
            max_tokens: 300,
          });

          const reply = gptResponse.choices[0].message.content.trim();
          gptContext[sender].push({ role: "assistant", content: reply });
          msg.reply(reply);
        } catch (error) {
          console.error("Error chatting with OpenAI:", error);
          msg.reply("Sorry, ga bisa ngobrol sekarang.");
        }
      }
      break;
    case "/!help":
      msg.reply(
        `Yow! Ini daftar perintah yang bisa loe gunain:
      - */!kerjaan add [tugas]*: Mau nambah kerjaan baru? Gampang, pake ini!
      - */!kerjaan list*: Pengen lihat kerjaan yang harus loe kerjain? Pake aja ini.
      - */!kerjaan delete [nomor]*: Kalau udah kelar kerjaan, atau mau hapus, pake ini.
      
      - */!pengeluaran add [nama] | [jumlah]*: Abis boros? Catet pengeluaran loe pake ini.
      - */!pengeluaran list*: Mau liat berapa borosnya loe? Cek daftar pengeluaran loe di sini.
      - */!pengeluaran delete [nomor]*: Salah catet? Gampang, hapus aja pake ini.
      - */!pengeluaran summary*: Pengen tau total pengeluaran loe? Cek di sini.
      - */!pengeluaran insight*: Pengen dapet insight atau masukan soal pengeluaran loe? Loe bisa cek di sini.
      
      - */!ingetin [jam:menit] [pesan]*: Mau diingetin sesuatu? Biar Paijo yang ingetin loe!
      - */!gpt [pesan]*: Mau ngobrol santai sama Paijo? Tulis pesan loe di sini.
      - */!gpt reset*: Chat udah panjang atau loe mau mulai dari awal? Reset aja pake ini.
      
      Mau tau lebih lanjut? Tanya aja ke Paijo, bro!`
      );
      break;
    // Add more command cases as needed...
    default:
      break;
  }
}

// Event listeners
whatsappClient.on("loading_screen", (percent, message) => {
  console.log("LOADING SCREEN", percent, message);
});

whatsappClient.on("qr", (qr) => {
  Qrcode.generate(qr, { small: true });
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
  if (msg.from === "status@broadcast" || msg.hasQuotedMsg || !msg.fromMe)
    return;

  console.log("MESSAGE RECEIVED", msg);
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
