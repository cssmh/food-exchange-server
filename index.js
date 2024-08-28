const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "https://foodshare-3bbc0.web.app",
      "https://mealplaterz.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const gateMan = async (req, res, next) => {
  const token = req?.cookies?.token;
  //   console.log(token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      res.status(401).send({ message: "unauthorized access" });
    } else {
      req.decodedUser = decoded;
      next();
    }
  });
};

// mongo code
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vvrohrj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollection = client.db("mealPlaterz").collection("foods");
    const requestCollection = client.db("mealPlaterz").collection("request");
    const userCollection = client.db("mealPlaterz").collection("users");
    const reviewCollection = client.db("mealPlaterz").collection("reviews");

    app.post("/jwt", async (req, res) => {
      try {
        const userEmail = req.body;
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
    });

    app.get("/logout", async (req, res) => {
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
    });

    app.get("/allFoods", async (req, res) => {
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
        res
          .status(500)
          .send({ error: "An error occurred while fetching foods." });
      }
    });

    app.post("/add-review", gateMan, async (req, res) => {
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
    });

    app.delete("/review", gateMan, async (req, res) => {
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
    });

    app.get("/all-reviews", async (req, res) => {
      try {
        const limit = parseInt(req.query?.limit);
        const sortReviews = req.query?.sort === "true";
        let query = reviewCollection.find().limit(limit);

        if (sortReviews) {
          query = query.sort({ _id: -1 });
        }
        const result = await query.toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/featured-foods", async (req, res) => {
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
    });

    app.post("/add-food", async (req, res) => {
      try {
        const foodData = req.body;
        const result = await foodCollection.insertOne(foodData);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/food/:id", async (req, res) => {
      try {
        const query = { _id: new ObjectId(req.params?.id) };
        const result = await foodCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/myFoods", gateMan, async (req, res) => {
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
    });

    app.put("/my-all-foods/:email", gateMan, async (req, res) => {
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
    });

    app.delete("/delete-food/:email/:id", gateMan, async (req, res) => {
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
    });

    app.put("/update-food/:id/:email", gateMan, async (req, res) => {
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
    });

    app.post("/add-request", async (req, res) => {
      try {
        const requestedData = req.body;
        const result = await requestCollection.insertOne(requestedData);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.put("/add-review/:id/:email", gateMan, async (req, res) => {
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
    });

    app.get("/my-requested", gateMan, async (req, res) => {
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
    });

    app.get("/pending-request/:id/:email", gateMan, async (req, res) => {
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
    });

    app.put("/requested-status/:id", async (req, res) => {
      try {
        const idx = req.params.id;
        const filter = { _id: new ObjectId(idx) };
        const options = { upsert: true };
        const updateStatus = req.body;
        const updated = {
          $set: {
            status: updateStatus.newStatus,
          },
        };
        const result = await requestCollection.updateOne(
          filter,
          updated,
          options
        );
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/unavailable-ids", gateMan, async (req, res) => {
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
    });

    app.put("/add-time/:id", async (req, res) => {
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
    });

    app.put("/food-status/:id", async (req, res) => {
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
    });

    app.delete("/my-request/:email/:id", gateMan, async (req, res) => {
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
    });

    app.put("/add-user", async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email.toLowerCase() };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return;
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
    
    app.post("/create-payment-intent", async (req, res) => {
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
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// mongo code end

app.get("/", (req, res) => {
  res.send("FIND YOUR FOOD");
});

app.listen(port, () => {
  console.log(`CRUD IS RUNNING ON PORT ${port}`);
});
