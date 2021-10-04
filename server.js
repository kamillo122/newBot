const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const uri =
  "mongodb+srv://AdminKamilo:I1udrg12@cluster0.8from.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

app.listen(PORT, () => {
  console.log(`it's alive on http://localhost:${PORT}`);
});

app.post("/id", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    console.log("No id provided");
    res.status(418).send({
      error: "Podaj id",
    });
  } else {
    const clientDb = await MongoClient.connect(uri, {
      useNewUrlParser: true,
    }).catch((err) => {
      console.log(err);
    });
    if (!clientDb) {
      return;
    }
    try {
      const db = clientDb.db("margo");
      const collection = db.collection("player");
      const query = { id: `${id}` };
      const checkID = await collection.findOne(query);
      if (!checkID) {
        console.log(`Klient o id: ${id} brak licencji`);
        res.send({
          type: "nolic",
        });
      } else {
        fs.readFile(`./newBot.js`, (error, content) => {
          if (error) {
            res.end("File not found");
            return;
          }
          res.writeHead(200, {
            "Content-Type": `application/javascript`,
          });
          res.end(content, "utf-8");
        });
      }
    } catch (err) {
      console.log(err);
    } finally {
      clientDb.close();
    }
  }
});
