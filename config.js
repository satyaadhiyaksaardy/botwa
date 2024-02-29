const dotenv = require("dotenv");
dotenv.config();

const {
  MY_NUMBER,
  DATA_FILE,
  OPENAI_API_KEY,
  CCTV_RTSP_URL,
  ALLOWED_USERS,
  ALLOWED_GROUPS,
} = process.env;

module.exports = {
  MY_NUMBER,
  DATA_FILE,
  OPENAI_API_KEY,
  CCTV_RTSP_URL,
  ALLOWED_USERS,
  ALLOWED_GROUPS,
};
