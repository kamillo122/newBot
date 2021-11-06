const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();
const { MongoClient } = require("mongodb");
const uri =
	"mongodb+srv://AdminKamilo:I1udrg12@cluster0.8from.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

const generateAccessToken = (username, password) => {
	return jwt.sign(
		{ username: username, password: password },
		process.env.TOKEN_SECRET,
		{
			expiresIn: "2h",
		}
	);
};

const authenticateToken = (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];
	if (!token) {
		return res.send({
			authorized: "error",
		});
	}
	jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
		if (err) {
			return res.send({ error: "auth" });
		}
		res.send({
			auth: "ok",
		});
	});
};

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
		if (login !== checkID?.login || password !== checkID?.password) {
			res.send({
				error: "login error",
			});
		} else {
			process.env.TOKEN_SECRET = require("crypto")
				.randomBytes(64)
				.toString("hex");
			const token = generateAccessToken(login, password);
			res.end(
				JSON.stringify({
					ok: 1,
					token: token,
				})
			);
		}
	} catch (err) {
		console.log(err);
	} finally {
		await clientDb.close();
	}
});

app.post("/register", async (req, res) => {
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
		//sprawdzamy czy już jest taki user
		const query = { login: login };
		const checkID = await collection.findOne(query);
		if (!checkID) {
			//moze sie zarejestrowac, nie ma jego danych w bazie
			const insert = await collection.insertOne({
				login: login,
				password: password,
				score: [],
			});
			if (insert) {
				res.send({
					ok: 1,
				});
			}
		} else {
			//podal dane ktore juz sa w bazie
			res.send({
				error: "login error",
			});
		}
	} catch (err) {
		console.log(err);
	} finally {
		await clientDb.close();
	}
});

app.post("/game", async (req, res) => {
	const { login, score } = req.body;
	if (!score && !login) {
		console.log("data error");
		res.status(418).send({
			error: "data error",
		});
	}
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
	console.log(login, score);
	try {
		const db = await clientDb.db("snake");
		const collection = await db.collection("snakePlayers");
		const query = { login: login };
		const update = await collection.updateOne(
			{ login: login },
			{ $push: { score: score } }
		);
	} catch (err) {
		console.log(err);
	} finally {
		await clientDb?.close();
	}
});

app.post("/score", async (req, res) => {
	const { login } = req.body;
	if (!login) {
		console.log("data error");
		res.status(418).send({
			error: "data error",
		});
	}
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
		res.send({
			score: checkID?.score || "brak",
		});
	} catch (err) {
		console.log(err);
	} finally {
		await clientDb?.close();
	}
});

app.post("/check", authenticateToken, async (req, res) => {
	const { login } = req.body;
	if (!login) {
		console.log("data error");
		res.status(418).send({
			error: "data error",
		});
	}
});
