const client = require("../config/db");
const userCollection = client.db("mealPlaterz").collection("users");

const addUser = async (req, res) => {
  try {
    const user = req.body;
    const query = { email: user.email.toLowerCase() };
    const existingUser = await userCollection.findOne(query);

    if (existingUser) {
      return res.status(409).send({ message: "User already exists" });
    }

    const result = await userCollection.insertOne(user);
    res.send(result);
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

module.exports = { addUser, getUser, addUserMembership, };
