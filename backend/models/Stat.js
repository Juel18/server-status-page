const mongoose = require("mongoose");

module.exports = mongoose.model("Stat", new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    players: Number,
    online: Boolean
}));

