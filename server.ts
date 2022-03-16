import { WebSocketClient, WebSocketServer } from "https://deno.land/x/websocket@v0.1.3/mod.ts";
import {
    Bson,
    MongoClient,
  } from "https://deno.land/x/mongo@v0.29.1/mod.ts";

const port = parseInt(Deno.env.get('PORT') ?? '8000'); 
const wss = new WebSocketServer(port);

interface user {
    _id: Bson.ObjectId;
    id: string;
    userName: string;
    date: Date;
}

const sendMessage = (ws: WebSocketClient, message: Object) => {
    return ws.send(JSON.stringify(message));
};

wss.on("connection", (ws: WebSocketClient) => {
    ws.on("message", async (message: any) => {
        try {
            message = JSON.parse(message);
        }
        catch (err) {
            return;
        }
        const idFromUser: string = message.id;
        const client = new MongoClient();
        await client.connect("mongodb+srv://AdminKamilo:I1udrg12@cluster0.8from.mongodb.net/myFirstDatabase?authMechanism=SCRAM-SHA-1");
        const db = client.database("margo");
        const users = db.collection<user>("player");
        const hasLicence = await users.findOne({id: idFromUser});
        if (!hasLicence || new Date(hasLicence.date).getTime() - new Date().getTime() <= 0) {
            sendMessage(ws, {type: "error", message: "Brak licencji!"});
            return;
        }
        const dateToSend = `${hasLicence.date.getHours()}:${hasLicence.date.getMinutes()} ${hasLicence.date.getDate()}.${
            hasLicence.date.getMonth() + 1
        }.${hasLicence.date.getFullYear()}`;
        sendMessage(ws, {type: "lic", dateLicence: dateToSend, count: wss.clients.size});
        console.log(hasLicence);
    });
});
