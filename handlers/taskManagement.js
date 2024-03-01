const { store, saveData } = require("../utils/dataUtils");

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

module.exports = { handleTaskManagement };
