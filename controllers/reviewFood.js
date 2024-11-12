const { ObjectId } = require("mongodb");
const client = require("../config/db");
const reviewCollection = client.db("mealPlaterz").collection("reviews");
const requestCollection = client.db("mealPlaterz").collection("request");

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

module.exports = { addReview, deleteReview, getAllReview };
