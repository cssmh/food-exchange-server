const client = require("../config/db");
const userCollection = client.db("mealPlaterz").collection("users");
const timerCollection = client.db("mealPlaterz").collection("timer");

const addUser = async (req, res) => {
  try {
    const user = req.body;
    const query = { email: user.email.toLowerCase() };

    const result = await userCollection.updateOne(query, {
      $set: user
    }, { upsert: true });

    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const checkIsAdmin = async (req, res) => {
  try {
    if (req.decodedUser?.email !== req.params?.email) {
      return res.status(401).send({ message: "Forbidden access" });
    }
    const result = await userCollection.findOne({ email: req.params?.email });
    if (result) {
      res.send(result);
    } else {
      res.status(404).send({ message: "User not found" });
    }
  } catch (err) {
    console.log(err);
  }
};

const getUser = async (req, res) => {
  try {
    if (req.decodedUser?.email !== req.params?.email) {
      return res.status(401).send({ message: "Forbidden access" });
    }
    const email = req.params.email;
    const result = await userCollection.findOne({ email });
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const addUserMembership = async (req, res) => {
  try {
    if (req.decodedUser.email !== req.params?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    const { email } = req.params;
    const user = await userCollection.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const updatedDocs = {
      $set: {
        premium_date: req.body.premium_date,
        paymentIntent_Id: req.body.paymentIntent_Id,
      },
    };
    const result = await userCollection.updateOne({ email }, updatedDocs);
    res.send(result);
  } catch (error) {
    console.log(err);
  }
};

const getPremiumTime = async (req, res) => {
  try {
    const currentTime = Math.floor(Date.now() / 1000);
    const existingTime = await timerCollection.findOne({ key: "premiumEndTime" });

    if (!existingTime || existingTime.endTime === 0 || currentTime > existingTime.endTime) {
      return res.send({ endTime: 0 }); // Timer is stopped or expired
    }

    res.send({ endTime: existingTime.endTime });
  } catch (error) {
    console.log(error);
  }
};

const updatePremiumTime = async (req, res) => {
  try {
    const { days } = req.body;
    if (isNaN(days) || days < 0) {
      return res.status(400).send({ message: "Invalid number of days" });
    }

    let newEndTime = 0; // Default for stopping the timer
    if (days > 0) {
      const currentTime = Math.floor(Date.now() / 1000);
      newEndTime = currentTime + days * 24 * 3600;
    }

    await timerCollection.updateOne(
      { key: "premiumEndTime" },
      { $set: { endTime: newEndTime } },
      { upsert: true }
    );

    res.send({ endTime: newEndTime });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { addUser, checkIsAdmin, getUser, addUserMembership, getPremiumTime, updatePremiumTime };
