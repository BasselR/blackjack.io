const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

// DeckModule's other exports are .Values and .Suits
const Deck = require('./DeckModule').Deck;

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

var players = [];

gameDeck = new Deck();
gameDeck.shuffle();
//console.log(gameDeck);

//gameDeck.pop();

io.on('connection', socket => {
    console.log(socket.id);
    //console.log(players);
    players.push(socket.id);
    console.log(players);



    socket.on('disconnect', something => {
        console.log("disconncting...");
        console.log(something);
    });
});

function hit(){
    /// deal a card to player
}

// io.on('disconnect', something => {
//     console.log("disconnecting...");
//     console.log(something);
// });

// io.on('connection', socket => {
    //console.log("INSIDE IO CONNECTION EVENT LISTENER");
    // console.log(socket);
    // socket.deck = new Deck();
    // socket.deck.shuffle();
    // io.emit('render', socket.deck);
    // socket.on('join room 1', () => {
    //     socket.join('room 1', () => {
    //         socket.emit('personal');
    //         console.log("A client has joined room 1.");
    //     });
    // });
// });

// setInterval(function(){
//     io.to('room 1').emit('room 1 only', __dirname);
// }, 1000);

server.listen(PORT, () => {
    console.log("Listening on port %d", PORT);
});