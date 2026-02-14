const express = require("express");
const axios = require("axios");
const WebSocket = require("ws");
const cron = require("node-cron");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = 3000;
const SERVER_IP = "mslc.mc-complex.com";
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1472065540112519314/wiYrjhfjcTL_aEsRpcLzD_QaFTEAEuFFZyYZfxUiLV7jyzBnqlecZcrG8PZO7L9PIcka";

let serverData = {};
let history = [];
let lastStatus = null;

const wss = new WebSocket.Server({ noServer: true });

async function checkServer() {
    try {
        const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
        serverData = res.data;

        history.push({
            time: Date.now(),
            players: res.data.players?.online || 0
        });

        if (history.length > 100) history.shift();

        if (lastStatus !== res.data.online) {
            sendDiscordAlert(res.data.online);
            lastStatus = res.data.online;
        }

        broadcast();

    } catch (err) {
        console.error("Error checking server");
    }
}

function broadcast() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ serverData, history }));
        }
    });
}

async function sendDiscordAlert(status) {
    await axios.post(DISCORD_WEBHOOK, {
        content: status
            ? "🟢 Server is ONLINE!"
            : "🔴 Server is OFFLINE!"
    });
}

cron.schedule("*/15 * * * * *", checkServer);

app.get("/api/status", (req, res) => {
    res.json({ serverData, history });
});

const server = app.listen(PORT, () =>
    console.log(`Server running on ${PORT}`)
);

server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, ws => {
        wss.emit("connection", ws, req);
    });
});
