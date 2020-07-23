const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const DeckModule = require('./DeckModule');
const Deck = DeckModule.Deck;

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

gameDeck = new Deck();
gameDeck.shuffle();
console.log(gameDeck);

// io.on('connection', socket => {
//     //console.log(socket);
//     socket.deck = new Deck.deck();
//     socket.deck.shuffle();
//     io.emit('render', socket.deck);
//     socket.on('join room 1', () => {
//         socket.join('room 1', () => {
//             socket.emit('personal');
//             console.log("A client has joined room 1.");
//         });
//     });
// });

// setInterval(function(){
//     io.to('room 1').emit('room 1 only', __dirname);
// }, 1000);

server.listen(PORT, () => {
    console.log("Listening on port %d", PORT);
});