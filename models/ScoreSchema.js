const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    name: String,
    score: {type: Number, default: 1}
});

module.exports = mongoose.model('Score', scoreSchema);