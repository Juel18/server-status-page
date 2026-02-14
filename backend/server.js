const express = require("express");
const axios = require("axios");
const WebSocket = require("ws");
const cron = require("node-cron");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { generateToken, verifyToken } = require("./auth");
const { SimpleLinearRegression } = require("ml-regression");

const Stat = require("./models/Stat");
const Downtime = require("./models/Downtime");
const Peak = require("./models/Peak");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SERVER_IP = "mslc.mc-complex.com";
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1472065540112519314/wiYrjhfjcTL_aEsRpcLzD_QaFTEAEuFFZyYZfxUiLV7jyzBnqlecZcrG8PZO7L9PIcka";
const ADMIN_USER = "admin";
const ADMIN_PASS_HASH = bcrypt.hashSync("password123", 10);

mongoose.connect("YOUR_MONGODB_URI");

let lastStatus = null;
let downtimeStart = null;

const wss = new WebSocket.Server({ noServer: true });

async function checkServer() {
    try {
        const res = await axios.get(`https://api.mcsrvstat.us/2/${SERVER_IP}`);
        const online = res.data.online;
        const players = res.data.players?.online || 0;

        await Stat.create({ players, online });

        if (lastStatus === true && online === false) {
            downtimeStart = new Date();
        }

        if (lastStatus === false && online === true && downtimeStart) {
            const end = new Date();
            await Downtime.create({
                start: downtimeStart,
                end,
                duration: end - downtimeStart
            });
            downtimeStart = null;
        }

        const peakData = await Peak.findOne();
        if (!peakData || players > peakData.peak) {
            await Peak.deleteMany({});
            await Peak.create({ peak: players, achievedAt: new Date() });
        }

        if (lastStatus !== online) {
            await axios.post(DISCORD_WEBHOOK, {
                content: online ? "🟢 Server ONLINE" : "🔴 Server OFFLINE"
            });
        }

        lastStatus = online;
        broadcast(res.data);

    } catch (err) {
        console.log("Server check failed");
    }
}

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

cron.schedule("*/15 * * * * *", checkServer);

app.post("/admin/login", async (req, res) => {
    const { username, password } = req.body;

    if (username !== ADMIN_USER)
        return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, ADMIN_PASS_HASH);
    if (!valid)
        return res.status(400).json({ error: "Invalid credentials" });

    res.json({ token: generateToken(username) });
});

app.get("/admin/analytics", verifyToken, async (req, res) => {
    const stats = await Stat.find();
    const peak = await Peak.findOne();
    const downtime = await Downtime.find();

    const X = stats.map((_, i) => i);
    const Y = stats.map(s => s.players);
    let prediction = 0;

    if (X.length > 2) {
        const regression = new SimpleLinearRegression(X, Y);
        prediction = regression.predict(X.length + 4);
    }

    res.json({ stats, peak, downtime, prediction });
});

const server = app.listen(PORT, () =>
    console.log("Server running")
);

server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, ws => {
        wss.emit("connection", ws, req);
    });
});
