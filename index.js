const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

// middleware
app.use(cors());
app.use(express.json());

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

    // create database
    const db = client.db("ticketoDB");
    const organizationCollection = db.collection("organizations");
    const eventCollection = db.collection("events");
    const usersCollection = db.collection("user");
    const bookingCollection = db.collection("bookings");
    const paymentCollection = db.collection("payments");

    //  Create Get API for organization
    app.get("/api/organizations/:email", async (req, res) => {
      const { email } = req.params;
      const result = await organizationCollection.findOne({
        organizerEmail: email,
      });
      res.send(result);
    });

    //  Create POST API for organization
    app.post("/api/organizations", async (req, res) => {
      const { organizationName, logo, website, description, organizerEmail } =
        req.body;

      const addData = {
        organizationName,
        logo,
        website,
        description,
        organizerEmail,
        createdAt: new Date(),
        status: "active",
      };

      const result = await organizationCollection.insertOne(addData);
      console.log(result);
      res.json(result);
    });

    //  Create Patch API for organization data update
    app.patch("/api/organizations/:id", async (req, res) => {
      //   const { id } = req.params.id;
      const id = req.params.id;
      const { organizationName, logo, website, description, organizerEmail } =
        req.body;

      const updateData = {
        organizationName,
        logo,
        website,
        description,
        organizerEmail,
        // createdAt: new Date(),
        updatedAt: new Date(),

        status: "active",
      };

      const org = await organizationCollection.findOne({
        _id: new ObjectId(id),
      });
      console.log(org, "findOne");

      //   ***
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Organization ID" });
      }
      //   ***
      const result = await organizationCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updateData,
        },
      );

      console.log(result);
      res.json(result);
    });

    // ****** events ar sob api***

    // ! **********
    // GET API  for all events for "browse events" page
    app.get("/api/events", async (req, res) => {
      const cursor = eventCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // GET API  for all events for " events details" page
    app.get("/api/single-events/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await eventCollection.findOne(query);
      res.send(result);
    });

    // ! **********

    //  Create Get API for manage events
    app.get("/api/events/:email", async (req, res) => {
      try {
        const { email } = req.params;
        console.log("Fetching events for:", email);

        const result = await eventCollection
          .find({ organizationEmail: email })
          .toArray();

        if (!result || result.length === 0) {
          return res.send([]);
        }

        res.send(result);
      } catch (error) {
        console.error("Backend Error:", error);

        res
          .status(500)
          .send({ error: "Internal Server Error", message: error.message });
      }
    });

    //  Create POST API for add events
    app.post("/api/events", async (req, res) => {
      const data = req.body;
      //   console.log(data);
      const organizer = await usersCollection.findOne({
        email: data?.organizationEmail,
      });
      //   console.log(organizer);
      const organizerEventsCounts = await eventCollection.countDocuments({
        organizationEmail: data?.organizationEmail,
      });
      //   console.log(organizerEventsCounts, "organizerEvents count");
      if (!organizer?.isPremium && organizerEventsCounts >= 3) {
        return res.status(401).send({ message: "your free limit in over" });
      }
      //   return;

      const result = await eventCollection.insertOne({
        ...data,
        status: "Pending",
      });
      console.log(result);
      res.json(result);
    });

    //  Create Patch API for events data update
    app.patch("/api/events/:id", async (req, res) => {
      //   const { id } = req.params.id;
      const id = req.params.id;
      const updateData = req.body;
      const result = await eventCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updateData,
        },
      );

      console.log(result);
      res.json(result);
    });

    //  Create delete API for delete event
    app.delete("/api/events/:id", async (req, res) => {
      const { id } = req.params;
      const result = await eventCollection.deleteOne({ _id: new ObjectId(id) });

      res.send(result);
    });

    // ******* pinged ******
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// rootRoute
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
