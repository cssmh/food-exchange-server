require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const paymentIntent = async (req, res) => {
  try {
    const { price } = req.body;
    const amount = parseInt(price * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_types: ["card"],
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.log(err);
  }
};

module.exports = { paymentIntent };
