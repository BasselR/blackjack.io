const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const Deck = require('./Deck');

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
    //console.log(socket);
    socket.deck = new Deck.deck();
    socket.deck.shuffle();
    io.emit('render', socket.deck);
});

// let myDeck = new Deck.deck();
// myDeck.shuffle();
//console.log(myDeck);

server.listen(PORT, () => {
    console.log("Listening on port %d", PORT);
});