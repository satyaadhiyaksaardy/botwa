const fs = require("fs");
const { DATA_FILE } = require("../config");

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    return {
      settings: data.settings || { isAdminMode: false },
      store: data.store || {},
      gptContext: data.gptContext || {},
      listeningChats: data.listeningChats || {},
    };
  }
  return {
    settings: { isAdminMode: false },
    store: {},
    gptContext: {},
    listeningChats: {},
  };
}

const {
  settings = {},
  store = {},
  gptContext = {},
  listeningChats = {},
} = loadData();

function saveData() {
  const fullData = {
    settings: settings,
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
    store[user] = { tasks: [], expenses: [], reminders: [], questions: [] };
  }
}

module.exports = {
  loadData,
  saveData,
  ensureUserStore,
  listeningChats,
  gptContext,
  store,
  settings,
};
