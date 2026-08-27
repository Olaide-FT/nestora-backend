const mongoose = require("mongoose")
const dotenv = require("dotenv")

dotenv.config();
const MONGODB = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/realestate';

const connectDB = async() => {
    try {
        if (!process.env.MONGODB_URL) {
            console.warn('MONGODB_URL not set; falling back to default local MongoDB at', MONGODB);
        }
        await mongoose.connect(MONGODB);
        console.log("Database Connected Successfully")
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = connectDB;
