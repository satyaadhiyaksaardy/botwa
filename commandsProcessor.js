const {
  store,
  gptContext,
  listeningChats,
  ensureUserStore,
  saveData,
} = require("./dataManager");
const OpenAIApi = require("openai").default;
const { OPENAI_API_KEY } = require("./config");

const openaiClient = new OpenAIApi({
  key: OPENAI_API_KEY,
  organization: "org-ievih6LsBjEbJfmo2FA0CEbP",
});

// processReminders, provideInsights, processCommands
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
    msg.reply(`Oi, mau ngingetin aja: ${reminder}. Jangan lupa ya, bro!`);
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
    return "Wah maap, gabisa kasih insights sekarang.";
  }
}

async function processCommands(msg, sender) {
  ensureUserStore(sender);

  const contact = await msg.getContact();
  const command = msg.body.split(" ")[0];
  const args = msg.body.substring(command.length).trim();

  // Capture messages if listening mode is active for this sender
  if (listeningChats[msg.id.remote]) {
    listeningChats[msg.id.remote].push(
      "<start>" + contact.pushname ?? sender + ": " + msg.body + "<end>"
    );
    saveData();
  }

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
        if (!gptContext[sender] || gptContext[sender].length === 0) {
          gptContext[sender] = [
            {
              role: "system",
              content:
                "You are a helpful assistant named 'Paijo'. You always reply to any message you get in slang indonesian language, forever.",
            },
          ];
        }

        // Add the received message to the context
        gptContext[sender].push({ role: "user", content: msg.body });
        saveData();

        // Ensure context doesn't grow too long (you can adjust the number based on your needs)
        if (gptContext[sender].length > 10) {
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
          saveData();
          msg.reply(reply);
        } catch (error) {
          console.error("Error chatting with OpenAI:", error);
          msg.reply("Sorry, ga bisa ngobrol sekarang.");
        }
      }
      break;
    case "/!help":
      msg.reply(
        `Wassup, bro! Ini daftar perintah yang bisa loe pake:
    
- **Kerjaan lo**:
  - */!kerjaan add [tugas]*: Mau nambah kerjaan baru? Pake ini.
  - */!kerjaan list*: Pengen lihat kerjaan yang belum loe kerjain? Pake aja ini.
  - */!kerjaan delete [nomor]*: Udah kelar atau salah input? Hapus aja pake ini.

- **Pengeluaran lo**:
  - */!pengeluaran add [nama] | [jumlah]*: Catet borosan loe pake ini.
  - */!pengeluaran list*: Pengen cek borosan loe? Cek sini.
  - */!pengeluaran delete [nomor]*: Salah catet? No worries, hapus aja.
  - */!pengeluaran summary*: Mau tau total pengeluaran? Cek di sini.
  - */!pengeluaran insight*: Pengen insight soal duit loe? Pake ini.

- **Reminder**:
  - */!ingetin [jam:menit] [pesan]*: Mau diingetin sesuatu? Biar Paijo yang urus!

- **Ngobrol santai**:
  - */!gpt [pesan]*: Pengen curhat atau tanya-tanya? Sini ngobrol.
  - */!gpt reset*: Mau mulai dari awal lagi? Reset chat di sini.

- **Nyimak obrolan**:
  - */!startlistening*: Paijo mulai nyimak obrolan lo.
  - */!stoplistening*: Paijo berhenti nyimak dan rangkum obrolan.

Paijo siap membantu loe! Jangan sungkan buat tanya apa aja, ok?`
      );
      break;
    case "/!startlistening":
      msg.reply(await startListening(msg.id.remote));
      break;
    case "/!stoplistening":
      msg.reply(await stopListening(msg.id.remote));
      break;
    // Add more command cases as needed...
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
  const formattedChat = messages.map((msg) => msg).join("\n");
  const prompt = `${formattedChat}`;

  const gptResponse = await openaiClient.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You will be provided with group chat discussion, and your task is to summarize the discussion as follows:
          
          -Overall summary of discussion
          -Action items (what needs to be done and who is doing it)
          -If applicable, a list of topics that need to be discussed more fully in the next discussion.

          You are always reply in indonesian language, forever.`,
      },
      { role: "user", content: prompt },
    ],
    model: "gpt-3.5-turbo",
    temperature: 0.8,
    max_tokens: 2000,
  });

  return gptResponse.choices[0].message.content.trim();
}

module.exports = {
  processReminders,
  provideInsights,
  processCommands,
  startListening,
  stopListening,
  summarizeChat,
  // ... and so on
};
