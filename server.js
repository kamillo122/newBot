const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const uri =
	"mongodb+srv://AdminKamilo:I1udrg12@cluster0.8from.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

app.listen(PORT, () => {
	console.log(`it's alive on http://localhost:${PORT}`);
});

app.post("/", async (req, res) => {
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
			const licenceDate = new Date(checkID.date);
			const today = new Date();
			if (licenceDate - today <= 0) {
				console.log(`Klient o id: ${id} brak licencji`);
				res.send({
					lic: "nolic",
					dateLicense: "expired",
				});
			} else {
				res.send({
					lic: "ok",
					dateLicense: `${licenceDate.getHours()}:${licenceDate.getMinutes()} ${licenceDate.getDate()}.${
						licenceDate.getMonth() + 1
					}.${licenceDate.getFullYear()}`,
				});
			}
		} catch (err) {
			console.log(err);
		} finally {
			clientDb.close();
		}
	}
});
