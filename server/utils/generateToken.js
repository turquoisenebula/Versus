const jwt = require("jsonwebtoken");
const env = require("../config/env");

function generateToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

module.exports = generateToken;
