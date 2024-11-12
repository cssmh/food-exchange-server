const { ObjectId } = require("mongodb");
const client = require("../config/db");
const foodCollection = client.db("mealPlaterz").collection("foods");
const requestCollection = client.db("mealPlaterz").collection("request");

const getAllFoods = async (req, res) => {
  try {
    const page = parseInt(req.query?.page);
    const limit = parseInt(req.query?.limit);
    const searchTerm = req.query?.search || "";
    const skipIndex = (page - 1) * limit;

    const query = {
      $or: [
        { food_name: { $regex: searchTerm, $options: "i" } },
        { pickup_location: { $regex: searchTerm, $options: "i" } },
      ],
    };
    const totalFoods = (await foodCollection.countDocuments(query)) || 0;
    const totalPages = Math.ceil(totalFoods / limit) || 0;

    const cursor = foodCollection
      .find(query)
      .sort({
        expiration_date: 1,
        expiration_time: 1,
      })
      .skip(skipIndex)
      .limit(limit);

    const result = await cursor.toArray();
    res.send({ totalPages, totalFoods, result });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "An error occurred while fetching foods." });
  }
};

const getFeaturedFood = async (req, res) => {
  try {
    const result = await foodCollection
      .find()
      .sort({ food_quantity: -1 })
      .limit(8)
      .toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const getAFood = async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params?.id) };
    const result = await foodCollection.findOne(query);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const getMyFoods = async (req, res) => {
  try {
    if (req.decodedUser.email !== req.query?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }

    let query = {};
    if (req.query?.email) {
      query = { donator_email: req.query.email };
    }
    const foodItems = await foodCollection.find(query).toArray();
    const myIds = foodItems.map((item) => item._id.toString());
    // Create an object to store the count for each food item
    const counts = {};
    for (const id of myIds) {
      const count = await requestCollection.countDocuments({
        food_id: id,
      });
      counts[id] = count;
    }
    // Add the count to each food item
    const resultWithCounts = foodItems.map((item) => {
      return {
        ...item,
        requestCount: counts[item._id.toString()] || 0,
      };
    });
    res.send(resultWithCounts);
  } catch (err) {
    console.log(err);
  }
};

const getMyRequested = async (req, res) => {
  try {
    if (req.decodedUser.email !== req.query?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    let query = {};
    if (req.query?.email) {
      query = { user_email: req.query.email };
    }
    const result = await requestCollection.find(query).toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const getMyPending = async (req, res) => {
  try {
    if (req.decodedUser.email !== req.params?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    const idx = req.params.id;
    let query = {};
    if (idx) {
      query = { food_id: idx };
    }
    const result = await requestCollection.find(query).toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const getUnavailableIds = async (req, res) => {
  try {
    if (req.decodedUser?.email !== req.query?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    const query = {
      food_status: "Unavailable",
      donator_email: req.query?.email,
    };
    const options = {
      projection: { _id: 1 },
    };
    const cursor = foodCollection.find(query, options);
    const result = await cursor.toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  getAllFoods,
  getFeaturedFood,
  getAFood,
  getMyFoods,
  getMyRequested,
  getMyPending,
  getUnavailableIds,
};
