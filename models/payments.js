const mongoose = require("mongoose");

const Payment = mongoose.model("Payment", {
  name: String,
  price: Number,
  transaction: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = Payment;
