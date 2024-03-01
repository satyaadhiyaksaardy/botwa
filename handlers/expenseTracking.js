const OpenAIApi = require("openai").default;
const { saveData, store } = require("../utils/dataUtils");

const { OPENAI_API_KEY } = require("../config");
const openaiClient = new OpenAIApi({
  key: OPENAI_API_KEY,
});

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

module.exports = { handleExpenseTracking };
