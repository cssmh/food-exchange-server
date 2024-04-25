const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

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
    const requestedCollection = client
      .db("mealPlaterz")
      .collection("requested");

    app.get("/allFoods", async (req, res) => {
      try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const skipIndex = (page - 1) * limit;

        const cursor = foodCollection.find().skip(skipIndex).limit(limit);
        const result = await cursor.toArray();
        const totalFoods = await foodCollection.countDocuments();
        res.send({ totalFoods, result });
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
        const idx = req.params.id;
        const query = { _id: new ObjectId(idx) };
        const result = await foodCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/myFoods", async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { donator_email: req.query.email };
        }
        const result = await foodCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/delete-food/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await foodCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.put("/update-food/:id", async (req, res) => {
      try {
        const idx = req.params.id;
        const filter = { _id: new ObjectId(idx) };
        const options = { upsert: true };
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
          },
        };
        const result = await foodCollection.updateOne(filter, updated, options);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.post("/addRequest", async (req, res) => {
      try {
        const requestedData = req.body;
        const result = await requestedCollection.insertOne(requestedData);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/my-requested", async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { user_email: req.query.email };
        }
        const result = await requestedCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/manage-request/:id", async (req, res) => {
      try {
        const idx = req.params.id;
        let query = {};
        if (idx) {
          query = { food_id: idx };
        }
        const result = await requestedCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.put("/request-status/:id", async (req, res) => {
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
        const result = await requestedCollection.updateOne(
          filter,
          updated,
          options
        );
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
  res.send("MEAL RUNNING SUCCESSFULLY");
});

app.listen(port, () => {
  console.log(`CRUD IS RUNNING ON PORT ${port}`);
});
