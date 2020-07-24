const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

// DeckModule's other exports are .Values and .Suits
const Deck = require('./DeckModule').Deck;

app.use(express.static(path.join(__dirname, 'public')));

var players = [];
var room1Players = [];
var gameDeck;
var room1Population = 0;
//var p1 = {};
//players.push(p1);
//initGame();
//console.log(p1.hand);

setInterval(function(){
    console.log(room1Population);
}, 1000);

io.on('connection', socket => {
    console.log(socket.id);
    //console.log(players);
    players.push(socket.id);
    console.log(players);
    // Attempt to join room 1 (if there is space)
    socket.on('request room 1', () => {
        console.log(socket.id + " requesting to join room 1.");
        if(room1Population < 2){
            socket.join('room 1', () => {
                console.log(socket.id + " has successfully joined room 1.");
                console.log("Room 1 object:");
                console.log(io.sockets.adapter.rooms['room 1']);
                room1Population = io.sockets.adapter.rooms['room 1'].length;
                // Add player to room list (assuming they're not already in it)
                if(inRoom(socket, room1Players)){
                    console.log("Duplicate room-join attempt by " + socket.id);
                }
                else{
                    room1Players.push(socket);
                }
                socket.emit('join room 1');
                if(room1Population == 2){
                    // Second player has successfully joined, start this room's game
                    io.to('room 1').emit('start game');
                    initGame(room1Players);
                }
            });
        }
        else{
            console.log(socket.id + " cannot join room 1 (full).");
        }
    });
    //initGame(socket);
    // Hit
    socket.on('hit', () => {
        hit(socket);
    });
    // Disconnect
    socket.on('disconnect', something => {
        console.log("disconncting...");
        console.log(something);
    });
});

// Takes in an array of players (socket IDs?)
function initGame(players){
    console.log("Init game...");
    gameDeck = new Deck();
    gameDeck.shuffle();
    players.forEach((player) => {
        player.score = 0;
        player.bigAces = 0;
        // player hand might turn out to be unneccessary thanks to updating score instead
        player.hand = new Array();
        hit(player, 2);
    });
}

function hit(player, numOfCards = 1){
    // deal a card to player
    for(var i = 0; i < numOfCards; i++){
        console.log("Card hit...");
        let newCard = gameDeck.pop();
        // with updatePoints, player.hand.push(newCard) might be unneeded (if we just update points instead of keeping track of a hand)
        player.hand.push(newCard);
        updateScore(player, newCard);
        player.emit('hit', newCard);
    }
}

function updateScore(player, newCard){
    console.log("Updating score...");
    // If player drew an ace
    if(newCard.Value === "A"){
        player.bigAces++;
    }
    // If player is about to bust
    if(player.score + newCard.Points > 21){
        if(player.bigAces > 0){
            player.bigAces--;
            player.score -= 10;
        }
        else{
            // Game over - player busted
            console.log("Game over - player busted");
            //something like: player.emit('busted')
        }
    }
    player.score += newCard.Points;
    player.emit('update score', player.score);
}

// Returns whether or not a player is in a 'room' (list of sockets)
function inRoom(player, socketList){
    for(var i = 0; i < socketList.length; i++){
        if(socketList[i].id == player.id){
            return true;
        }
    }
    return false;
}

const PORT = process.env.PORT || 2000;

server.listen(PORT, () => {
    console.log("Listening on port %d", PORT);
});