const fs = require("fs");
const { DATA_FILE } = require("./config");

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    return {
      store: data.store || {},
      gptContext: data.gptContext || {},
      listeningChats: data.listeningChats || {},
    };
  }
  return { store: {}, gptContext: {}, listeningChats: {} };
}

const { store = {}, gptContext = {}, listeningChats = {} } = loadData();

function saveData() {
  const fullData = {
    store: store,
    gptContext: gptContext,
    listeningChats: listeningChats,
  };
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(fullData, null, 4), "utf-8");
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

function ensureUserStore(user) {
  if (!store[user]) {
    store[user] = { tasks: [], expenses: [], reminders: [] };
  }
}

module.exports = {
  loadData,
  saveData,
  ensureUserStore,
  listeningChats,
  gptContext,
  store,
};
