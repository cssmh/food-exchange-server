const { ObjectId } = require("mongodb");
const client = require("../config/db");
const foodCollection = client.db("mealPlaterz").collection("foods");
const reviewCollection = client.db("mealPlaterz").collection("reviews");
const requestCollection = client.db("mealPlaterz").collection("request");
const userCollection = client.db("mealPlaterz").collection("users");

const addReview = async (req, res) => {
  try {
    const email = req.decodedUser?.email;
    const deliveredReq = await requestCollection
      .find({
        $or: [{ user_email: email }, { donator_email: email }],
        status: "Delivered",
      })
      .toArray();

    if (!deliveredReq.length) {
      return res
        .status(400)
        .send({ message: "Complete at least one food handover first" });
    }

    // Check if the user has already added a review
    const existingReview = await reviewCollection.findOne({ email });
    if (existingReview) {
      return res.status(400).send({ message: "Review already added" });
    }

    const reviewData = req.body;
    const result = await reviewCollection.insertOne(reviewData);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const deleteReview = async (req, res) => {
  try {
    if (req.decodedUser.email !== req.query?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    const query = { _id: new ObjectId(req.query?.id) };
    const result = await reviewCollection.deleteOne(query);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const getAllReview = async (req, res) => {
  try {
    const sortReviews = req.query?.sort === "true";
    let query = reviewCollection.find();

    if (sortReviews) {
      query = query.sort({ _id: -1 });
    }
    const result = await query.toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const getDashboardData = async (req, res) => {
  try {
    const email = req.query?.email;
    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }
    if (req.decodedUser.email !== req.query?.email) {
      return res.status(403).send({ message: "Forbidden access" });
    }

    const user = await userCollection.findOne({ email: email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const foodCount = await foodCollection.countDocuments({ donator_email: email });
    const requestCount = await requestCollection.countDocuments({ user_email: email });
    const reviewCount = await reviewCollection.countDocuments({ email: email });
    const dashboardData = {
      user: {
        name: user.name,
        email: user.email,
        premium_date: user.premium_date,
        paymentIntent_Id: user.paymentIntent_Id,
      },
      foodCount,
      requestCount,
      reviewCount,
    };
    res.send(dashboardData);
  } catch (err) {
    console.log(err);
  }
};


module.exports = { addReview, deleteReview, getAllReview, getDashboardData };
