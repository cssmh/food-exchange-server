const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
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
        const cursor = foodCollection.find(query).skip(skipIndex).limit(limit);
        const result = await cursor.toArray();
        res.send({ totalPages, totalFoods, result });
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
        const updatedFoodData = req.body;
        const updated = {
          $set: {
            food_name: updatedFoodData.food_name,
            food_image: updatedFoodData.food_image,
            food_quantity: updatedFoodData.food_quantity,
            donator_phone: updatedFoodData.donator_phone,
            expired_date: updatedFoodData.expired_date,
            expired_time: updatedFoodData.expired_time,
            pickup_location: updatedFoodData.pickup_location,
            additional_notes: updatedFoodData.additional_notes,
            food_status: updatedFoodData.food_status,
          },
        };
        const result = await foodCollection.updateOne(filter, updated, {
          upsert: true,
        });
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

    app.patch("/add-time/:id", async (req, res) => {
      try {
        const filter = { _id: new ObjectId(req.params?.id) };
        const updated = {
          $set: {
            delivered_at: req.body?.todayDateTime,
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

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
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
