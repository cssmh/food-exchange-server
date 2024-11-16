const { ObjectId } = require("mongodb");
const client = require("../config/db");
const foodCollection = client.db("mealPlaterz").collection("foods");
const requestCollection = client.db("mealPlaterz").collection("request");

const addFood = async (req, res) => {
  try {
    const foodData = req.body;
    const result = await foodCollection.insertOne(foodData);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const deleteAFood = async (req, res) => {
  try {
    if (req.decodedUser.email !== req.params?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    const query = { _id: new ObjectId(req.params?.id) };
    const result = await foodCollection.deleteOne(query);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const addRequest = async (req, res) => {
  try {
    const requestedData = req.body;
    const result = await requestCollection.insertOne(requestedData);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

module.exports = { addFood, deleteAFood, addRequest };
