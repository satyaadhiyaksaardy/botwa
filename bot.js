// Imports
const OpenAIApi = require("openai").default;
const dotenv = require("dotenv");
const fs = require("fs");
const { Client, Qrcode, LocalAuth } = require("./index");

dotenv.config();

const { MY_NUMBER, DATA_FILE, OPENAI_API_KEY } = process.env;

// WhatsApp Client Initialization
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox"],
    headless: true,
  },
});

client.initialize();

const openai = new OpenAIApi({
  key: OPENAI_API_KEY,
  organization: "org-ievih6LsBjEbJfmo2FA0CEbP",
});

// Data Handling
let store = {};
const gptContext = {};

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const rawData = fs.readFileSync(DATA_FILE, "utf-8");
    store = JSON.parse(rawData);
  }
}

function saveData() {
  const jsonData = JSON.stringify(store, null, 4);
  fs.writeFileSync(DATA_FILE, jsonData, "utf-8");
}

function ensureUserStore(user) {
  if (!store[user]) {
    store[user] = {
      tasks: [],
      expenses: [],
    };
  }
}

loadData(); // Load data when the script runs

async function provideInsights(data, user) {
  // Construct a prompt using the saved data for analysis
  let prompt = `Provide insights for the following expenses data: Expenses - ${JSON.stringify(
    data[user].expenses
  )}`;

  // Get insights from OpenAI
  try {
    const gptResponse = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a cool whatsapp bot asking for insights that always reply in slang indonesian language. Reply any message you get in indonesian, forever.",
        },
        {
          role: "user",
          content: prompt,
        },
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

// Command Handling
async function processCommands(msg, sender) {
  ensureUserStore(sender);
  const command = msg.body.split(" ")[0];
  const args = msg.body.substring(command.length).trim();

  switch (command) {
    case "/!kerjaan":
      if (args.startsWith("add ")) {
        const task = args.replace("add ", "");
        store[sender].tasks.push(task);
        saveData();
        msg.reply(`Kerjaan udah ditambah, bro: ${task}. Yuk kerjain!`);
      } else if (args === "list") {
        const tasks = store[sender].tasks.join("\n");
        msg.reply(
          tasks.length > 0
            ? `List kerjaan lo:\n${tasks}`
            : `Lo ga punya kerjaan. Santuy dulu!`
        );
      } else if (args.startsWith("delete ")) {
        const index = parseInt(args.replace("delete ", ""), 10);
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
          .map((exp, idx) => `${idx}. ${exp.name} - $${exp.amount}`)
          .join("\n");
        msg.reply(
          expenses.length > 0
            ? `Daftar pengeluaran lo:\n${expenses}`
            : `Lo ga ada pengeluaran nih. Hemat banget!`
        );
      } else if (args.startsWith("delete ")) {
        const index = parseInt(args.replace("delete ", ""), 10);
        if (index >= 0 && index < store[sender].expenses.length) {
          const deletedExpense = store[sender].expenses.splice(index, 1);
          saveData();
          msg.reply(
            `Pengeluaran udah dihapus: ${deletedExpense[0].name} - $${deletedExpense[0].amount}. Uang lo aman!`
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
    case "/!gpt":
      if (args === "reset") {
        delete gptContext[sender];
        msg.reply("Chat context udah direset. Mulai dari awal lagi!");
      } else {
        if (!gptContext[sender]) gptContext[sender] = [];

        gptContext[sender].push({ role: "user", content: args });

        try {
          const gptResponse = await openai.chat.completions.create({
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
        `Yo, berikut ini daftar perintah yang bisa lo pake:
- */!kerjaan add [tugas]*: Tambah kerjaan baru.
- */!kerjaan list*: Lihat daftar kerjaan lo.
- */!kerjaan delete [nomor]*: Hapus kerjaan dengan nomor tertentu.

- */!pengeluaran add [nama] | [jumlah]*: Catat pengeluaran baru.
- */!pengeluaran list*: Lihat semua pengeluaran lo.
- */!pengeluaran delete [nomor]*: Hapus pengeluaran dengan nomor tertentu.
- */!pengeluaran summary*: Lihat total pengeluaran lo.
- */!pengeluaran insight*: Dapetin insight dari pengeluaran lo.

- */!gpt [pesan]*: Ngobrol dengan OpenAI. 
- */!gpt reset*: Reset konteks chat.

Mau tau lebih lanjut? Tanya aja!`
      );
      break;
    // Add more command cases as needed...
    default:
      break;
  }
}

// Event Listeners
client.on("loading_screen", (percent, message) => {
  console.log("LOADING SCREEN", percent, message);
});

client.on("qr", (qr) => {
  // NOTE: This event will not be fired if a session is specified.
  Qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("AUTHENTICATED");
});

client.on("auth_failure", (msg) => {
  // Fired if session restore was unsuccessful
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("ready", () => {
  console.log("READY");
});

client.on("message_create", async (msg) => {
  if (msg.from !== "status@broadcast" && !msg.hasQuotedMsg) {
    console.log("MESSAGE RECEIVED", msg);
    await processCommands(msg, msg.from);
  }
});

client.on("message_revoke_everyone", async (after, before) => {
  // Avoid processing for 'status@broadcast' and quoted messages
  if (after.from === "status@broadcast" || after.hasQuotedMsg) {
    return;
  }
  // Fired whenever a message is deleted by anyone (including you)

  // Send the message after it was deleted to yourself
  client.sendMessage(
    MY_NUMBER,
    `Message deleted in chat ${after.from}: ${after.body}`
  );

  if (before) {
    // Send the message before it was deleted to yourself
    client.sendMessage(
      MY_NUMBER,
      `Original message in chat ${before.from}: ${before.body}`
    );
  }
});
