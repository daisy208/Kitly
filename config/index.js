require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST,
  NODE_ENV: process.env.NODE_ENV || "development"
};
