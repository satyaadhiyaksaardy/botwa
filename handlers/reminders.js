const { saveData, ensureUserStore, store } = require("../utils/dataUtils");

async function handleReminders(msg, sender, args) {
  ensureUserStore(sender);
  const subArgs = msg.body.split(" ");
  const command = subArgs[0];
  const time = subArgs[1];
  const reminder = subArgs.slice(2).join(" ");

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

module.exports = { handleReminders };
