const mongoose = require("mongoose");

module.exports = mongoose.model("Downtime", new mongoose.Schema({
    start: Date,
    end: Date,
    duration: Number
}));

