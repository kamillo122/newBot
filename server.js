import WebSocket from "ws";
import { MongoClient } from "mongodb";
const uri =
	"mongodb+srv://AdminKamilo:I1udrg12@cluster0.8from.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

const wss = new WebSocket.Server({
	port: process.env.PORT || 8080,
});

wss.on("connection", async (ws) => {
	ws.on("message", async (data) => {
		try {
			data = JSON.parse(data);
		} catch (e) {
			sendError(ws, "Wrong format");
			return;
		}
		if (!data.hasOwnProperty("id")) {
			sendError(ws, "Id no provided");
			return;
		}
		const id = data.id;
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
				sendError(ws, "Brak licencji");
				return;
			}
			const licenceDate = new Date(checkID.date);
			const today = new Date();
			if (licenceDate - today <= 0) {
				console.log(`Klient o id: ${id} brak licencji`);
				const messageObject = {
					lic: "nolic",
					dateLicence: "expired",
				};
				sendCallback(ws, messageObject);
			} else {
				const messageObject = {
					lic: "ok",
					dateLicence: `${licenceDate.getHours()}:${licenceDate.getMinutes()} ${licenceDate.getDate()}.${
						licenceDate.getMonth() + 1
					}.${licenceDate.getFullYear()}`,
					count: wss.clients.size,
				};
				sendCallback(ws, messageObject);
			}
		} catch (err) {
			console.log(err);
		} finally {
			clientDb.close();
		}
	});
});

const sendCallback = (ws, message) => {
	const messageObject = {
		type: "lic",
		dateLicence: message.dateLicence,
		count: message.count,
	};
	ws.send(JSON.stringify(messageObject));
};

const sendError = (ws, message) => {
	const messageObject = {
		type: "ERROR",
		payload: message,
	};
	ws.send(JSON.stringify(messageObject));
};
