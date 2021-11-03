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

app.post("/login", async (req, res) => {
	const { login, password } = req.body;
	if (!login || !password) {
		console.log("No login data provided");
		res.status(418).send({
			error: "Podaj dane",
		});
	}
	console.log(login, password);
	const clientDb = await MongoClient.connect(uri, {
		useNewUrlParser: true,
	}).catch((err) => {
		console.log(err);
	});
	if (!clientDb) {
		res.send({
			error: "Database error connecting!",
		});
	}
	try {
		const db = await clientDb.db("snake");
		const collection = await db.collection("snakePlayers");
		const query = { login: login };
		const checkID = await collection.findOne(query);
		if (!checkID) {
			res.send({
				error: "login error",
			});
		} else {
			res.end(
				JSON.stringify({
					ok: 1,
				})
			);
		}
	} catch (err) {
		console.log(err);
	} finally {
		await clientDb.close();
	}
});
