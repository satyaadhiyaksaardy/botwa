async function handleStickerCreation(msg) {
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

module.exports = { handleStickerCreation };
