const OpenAIApi = require("openai").default;
const { gptContext, saveData } = require("../utils/dataUtils");

const { OPENAI_API_KEY } = require("../config");
const openaiClient = new OpenAIApi({
  key: OPENAI_API_KEY,
});
let gptModel = "gpt-3.5-turbo";

async function handleChatInteractions(msg, args) {
  const contact = await msg.getContact();
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

module.exports = { handleChatInteractions };
