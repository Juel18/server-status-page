const mongoose = require("mongoose");

module.exports = mongoose.model("Peak", new mongoose.Schema({
    peak: Number,
    achievedAt: Date
}));

