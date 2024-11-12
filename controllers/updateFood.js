const { ObjectId } = require("mongodb");
const client = require("../config/db");
const foodCollection = client.db("mealPlaterz").collection("foods");
const requestCollection = client.db("mealPlaterz").collection("request");

const putAllMyFoods = async (req, res) => {
  try {
    if (req.decodedUser?.email !== req.params?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    const filter = {
      donator_email: req.params?.email,
    };
    const updatedDocs = {
      $set: {
        donator_name: req.body.name,
        donator_image: req.body.photo,
      },
    };
    const result = await foodCollection.updateMany(filter, updatedDocs);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const updateMyFood = async (req, res) => {
  try {
    if (req.decodedUser.email !== req.params?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    const filter = { _id: new ObjectId(req.params?.id) };
    const updatedDocs = req.body;
    const options = { upsert: true };
    const updated = {
      $set: {
        food_name: updatedDocs.food_name,
        food_image: updatedDocs.food_image,
        food_quantity: updatedDocs.food_quantity,
        donator_phone: updatedDocs.donator_phone,
        expiration_date: updatedDocs.expiration_date,
        expiration_time: updatedDocs.expiration_time,
        pickup_location: updatedDocs.pickup_location,
        additional_notes: updatedDocs.additional_notes,
        food_status: updatedDocs.food_status,
      },
    };
    const result = await foodCollection.updateOne(filter, updated, options);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const updateMyReview = async (req, res) => {
  try {
    if (req.decodedUser.email !== req.params?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    const filter = { _id: new ObjectId(req.params?.id) };
    const updatedDoc = {
      $set: {
        user_review: req.body?.review,
      },
    };
    const result = await foodCollection.updateOne(filter, updatedDoc, {
      upsert: true,
    });
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const updateRequestedStatus = async (req, res) => {
  try {
    const filter = { _id: new ObjectId(req.params.id) };
    const options = { upsert: true };
    const updated = {
      $set: {
        status: req.body.newStatus,
      },
    };
    const result = await requestCollection.updateOne(filter, updated, options);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const addTime = async (req, res) => {
  try {
    const filter = { _id: new ObjectId(req.params?.id) };
    const updated = {
      $set: {
        delivered_date: req.body?.todayDateTime,
      },
    };
    const result = await requestCollection.updateOne(filter, updated, {
      upsert: true,
    });
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const updateFoodStatus = async (req, res) => {
  try {
    const filter = { _id: new ObjectId(req.params?.id) };
    const options = { upsert: true };
    const updated = {
      $set: {
        food_status: req.body?.foodStatus,
      },
    };
    const result = await foodCollection.updateOne(filter, updated, options);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const deleteMyRequest = async (req, res) => {
  try {
    if (req.decodedUser.email !== req.params?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    const query = { _id: new ObjectId(req.params.id) };
    const result = await requestCollection.deleteOne(query);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  putAllMyFoods,
  updateMyFood,
  updateMyReview,
  updateRequestedStatus,
  addTime,
  updateFoodStatus,
  deleteMyRequest,
};
