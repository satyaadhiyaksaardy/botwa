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

module.exports = { summarizeChat };
