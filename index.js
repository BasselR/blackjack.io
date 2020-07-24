const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

// DeckModule's other exports are .Values and .Suits
const Deck = require('./DeckModule').Deck;

app.use(express.static(path.join(__dirname, 'public')));

var players = [];
var gameDeck;
//var p1 = {};
//players.push(p1);
//initGame();
//console.log(p1.hand);

io.on('connection', socket => {
    console.log(socket.id);
    //console.log(players);
    players.push(socket.id);
    console.log(players);
    initGame(socket);
    socket.on('hit', () => {
        hit(socket);
    });
    socket.on('disconnect', something => {
        console.log("disconncting...");
        console.log(something);
    });
});

// Takes in an array of players (socket IDs?)
function initGame(player){
    gameDeck = new Deck();
    gameDeck.shuffle();
    player.hand = new Array();
    hit(player, 2);
}

function hit(player, numOfCards = 1){
    // deal a card to player
    for(var i = 0; i < numOfCards; i++){
        let newCard = gameDeck.pop();
        player.hand.push(newCard);
        player.emit('hit', newCard);
    }
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

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log("Listening on port %d", PORT);
});