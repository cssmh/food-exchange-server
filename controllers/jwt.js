const jwt = require("jsonwebtoken");
require("dotenv").config();

const addJwt = async (req, res) => {
  try {
    const userEmail = req.body;
    if (!userEmail) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    const getToken = jwt.sign(userEmail, process.env.ACCESS_TOKEN, {
      expiresIn: "7d",
    });
    res
      .cookie("token", getToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({ success: true });
  } catch (err) {
    console.log(err);
  }
};

const getLogout = async (req, res) => {
  try {
    res
      .clearCookie("token", {
        maxAge: 0,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({ success: true });
  } catch (err) {
    console.log(err);
  }
};

module.exports = { addJwt, getLogout };
