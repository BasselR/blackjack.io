const mongoose = require('mongoose');
const MongoURI = require('../secrets').MongoURI;

let mongoURI = process.env.mongoURI || MongoURI;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: true
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

module.exports = connectDB;