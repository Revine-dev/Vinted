const express = require("express");
const router = express.Router();
const fn = require("../middlewares/functions");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const User = require("../models/users");

router.post("/users/signup", async (req, res) => {
  const { email, username, phone, password } = req.fields;
  if (email && username && phone && password) {
    if (!username.match(/[A-Za-z]/)) {
      return fn.error(res, "Username format is not valid.");
    } else if (!fn.isValidMail(email)) {
      return fn.error(res, "Email is not valid.");
    }
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(encBase64);
    const token = uid2(16);
    const isUser = await User.findOne({ email });
    let picture = {};

    if (isUser) {
      return fn.error(res, "Sorry, this email is already taken.");
    }
    if (req.files.picture && !fn.isValidPicture(req.files.picture)) {
      return fn.error(res, "The req.files.picture is not valid.");
    } else if (req.files.picture && fn.isValidPicture(req.files.picture)) {
      picture = await fn.cloudinary().uploader.upload(req.files.picture.path, {
        folder: "/vinted/profile_picture/",
      });
    }

    const newUser = new User({
      email,
      account: {
        username,
        phone,
        avatar: picture,
      },
      token,
      hash,
      salt,
    });
    await newUser.save();
    return res.json({
      id: newUser._id,
      token: newUser.token,
      account: newUser.account,
    });
  }
  fn.accesDenied(res);
});

router.post("/users/login", async (req, res) => {
  const { email, password } = req.fields;
  if (email && password) {
    if (!fn.isValidMail(email)) {
      return fn.error(res, "Email is not valid.");
    }
    let user = await User.findOne({ email });
    if (!user) {
      user = {
        salt: null,
        password: null,
      };
    }
    const hash = SHA256(password + user.salt).toString(encBase64);
    if (hash === user.hash) {
      return res.json({
        _id: user._id,
        token: user.token,
        account: user.account,
      });
    } else {
      return fn.error(res, "Your mail or your password does not match.");
    }
  }
  fn.accesDenied(res);
});

module.exports = router;
