const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_API_PRIVATE);

const Offer = require("../models/offer");
const User = require("../models/users");
const Payment = require("../models/payments");

router.post("/pay", async (req, res) => {
  const { id, name, token } = req.fields.data;
  const stripeToken = req.fields.stripeToken;

  if (!id || !name) {
    return res.status(400).json({ message: "fail", error: "No product" });
  } else if (!token) {
    return res.status(400).json({ message: "fail", error: "Unknow error" });
  }

  try {
    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(400).json({ message: "fail", error: "No offer" });
    }
    const user = await User.findOne({ token: token });
    if (!user) {
      return res.status(400).json({ message: "fail", error: "Unknow error" });
    }

    const response = await stripe.charges.create({
      amount: (offer.product_price + 0.4 + 0.8) * 100,
      currency: "eur",
      description: `Achat de ${name} #${id}`,
      source: stripeToken,
    });

    const newPayment = new Payment({
      name,
      price: offer.product_price + 0.4 + 0.8,
      transaction: response,
      offer,
      buyer: user,
    });
    await newPayment.save();
    return res.status(200).json(response);
  } catch (error) {
    return res.status(401).json({ message: "fail", error: error.message });
  }
});

module.exports = router;
