const mongoose = require("mongoose");

const tokenBlocklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    expiresAt: {
        type: Date,
        required: true,
    },
});

tokenBlocklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TokenBlocklist = mongoose.model("TokenBlocklist", tokenBlocklistSchema);

module.exports = TokenBlocklist;
