const OpenAIApi = require("openai").default;
const { saveData, store } = require("../utils/dataUtils");

const { OPENAI_API_KEY } = require("../config");
const openaiClient = new OpenAIApi({
  key: OPENAI_API_KEY,
});

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

    store[sender].questions.push({
      role: "user",
      content: args,
    });
    saveData();

    const systemMessage = store[sender].questions[0];

    while (store[sender].questions.length > 10) {
      store[sender].questions.splice(1, 1);

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

module.exports = { handleQuestionChecking, handleQuestionCreation };
