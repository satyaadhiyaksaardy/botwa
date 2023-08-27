const dotenv = require("dotenv");
dotenv.config();

const { MY_NUMBER, DATA_FILE, OPENAI_API_KEY } = process.env;

module.exports = {
  MY_NUMBER,
  DATA_FILE,
  OPENAI_API_KEY,
};
