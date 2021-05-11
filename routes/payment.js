const express = require("express");
const router = express.Router();
const fn = require("../middlewares/functions");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/pay", async (req, res) => {
  //
});

module.exports = router;
