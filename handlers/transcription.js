const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const OpenAIApi = require("openai").default;
const { OPENAI_API_KEY } = require("../config");

const openaiClient = new OpenAIApi({
  key: OPENAI_API_KEY,
});

async function handleTranscription(msg) {
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
          console.log("File exists:", fs.existsSync(mp3Filename));

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

async function transcribeFunction(filename) {
  const audioStream = fs.createReadStream(filename);

  const transcript = await openaiClient.audio.transcriptions.create({
    file: audioStream,
    model: "whisper-1",
    language: "id",
  });

  return transcript.text;
}

module.exports = { handleTranscription };
