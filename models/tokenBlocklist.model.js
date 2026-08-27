const mongoose = require("mongoose");

/**
 * Stores invalidated JWT tokens so they cannot be reused after logout.
 *
 * The `expiresAt` field carries a TTL index — MongoDB automatically deletes
 * each document once the token's own expiry time is reached, so the collection
 * never grows unbounded.
 */
const tokenBlocklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // Must match the token's own exp claim so the document is cleaned up
    // at the same moment the token would have expired anyway.
    expiresAt: {
        type: Date,
        required: true,
    },
});

// TTL index — MongoDB removes the document automatically when expiresAt is reached.
tokenBlocklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TokenBlocklist = mongoose.model("TokenBlocklist", tokenBlocklistSchema);

module.exports = TokenBlocklist;
