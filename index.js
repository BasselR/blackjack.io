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
var p1Turn = true;
var p1Bool = true;
var lastTurn = false;
var room1Population = 0;
//var p1 = {};
//players.push(p1);
//initGame();
//console.log(p1.hand);

setInterval(function(){
    console.log(room1Population);
}, 3000);

io.on('connection', socket => {
    // auto assign nickname to matthew for testing
    socket.nick = "Matthew";
    console.log(socket.id + " joined.");
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
                    socket.p1 = p1Bool;
                    p1Bool = !p1Bool;
                    room1Players.push(socket);
                }
                socket.emit('join room 1');
                if(room1Population == 2){
                    // Second player has successfully joined, start this room's game
                    // this io.to('room 1').emit('start game') can be used to tell clients to hide initial screen
                    io.to('room 1').emit('start game');
                    initGame(room1Players);
                    // room1Players.forEach((player) => {
                    //     console.log(`Player id: ${player.id}, player num: ${player.playerNum}`);
                    // });
                }
            });
        }
        else{
            console.log(socket.id + " cannot join room 1 (full).");
        }
    });
    // Hit
    socket.on('hit', () => {
        if(socket.p1 == p1Turn){
            hit(socket);
            if(!getOpponent(socket, room1Players).stood){
                p1Turn = !p1Turn;
            }
        }
        // else if(socket.stood){
        //     console.log(socket.id + " tried to hit but they've already stood!");
        // }
        else{
            console.log(socket.nick + " tried to hit but it's not their turn.");
        }
        checkGameOver(room1Players);
    });
    // Stand
    socket.on('stand', () => {
        if(socket.p1 == p1Turn){
            socket.stood = true;
            console.log(socket.id + " stands.")
            // someoneStood = true;
            p1Turn = !p1Turn;
        }
        // else if(socket.stood){
        //     console.log(socket.id + " tried to hit but they've already stood!");
        // }
        else{
            console.log(socket.nick + " tried to stand but it's not their turn.");
        }
        checkGameOver(room1Players);
    });
    // Disconnect
    socket.on('disconnect', discMsg => {
        console.log(socket.id + " disconnected.");
        // Remove the disconnected player from room 1 players and update population
        room1Players = room1Players.filter(player => player.id == socket.id);
        room1Population = room1Players.length;
    });
});

// Takes in an array of players (sockets)
function initGame(players){
    console.log("Init game...");
    gameDeck = new Deck();
    gameDeck.shuffle();
    p1Turn = true;
    p1Bool = true;
    lastTurn = false;
    players.forEach((player) => {
        player.score = 0;
        player.bigAces = 0;
        player.stood = false;
        player.busted = false;
        // player hand might turn out to be unneccessary thanks to updating score instead
        player.hand = new Array();
        hit(player, 2);
    });
}

function getOpponent(player, socketList){
    console.log("get opponent socketList length: " + socketList.length);
    for(var i = 0; i < socketList.length; i++){
        if(socketList[i].p1 === !player.p1){
            return socketList[i];
        }
    }
}

function allStood(socketList){
    for(var i = 0; i < socketList.length; i++){
        if(!socketList[i].stood){
            return false;
        }
    }
    return true;
}

function anyBust(socketList){
    for(var i = 0; i < socketList.length; i++){
        if(socketList[i].busted){
            return true;
        }
    }
    return false;
}

function allBust(socketList){
    for(var i = 0; i < socketList.length; i++){
        if(!socketList[i].busted){
            return false;
        }
    }
    return true;
}

function checkGameOver(socketList){
    console.log("checking game over, last turn: " + lastTurn);
    // if(allStood(socketList) || anyBust(socketList) || (socketList[0].score == 21 && socketList[1].score == 21)){
    //     // Game over
    //     console.log("gameover test logging...");
    //     io.to('room 1').emit('game over');
    // }
    if(lastTurn){
        if(allBust(socketList)){
            io.to(socketList[0].id).emit('tie', socketList[1].hand);
            io.to(socketList[1].id).emit('tie', socketList[0].hand);
        }
        else{
            let winner = socketList.filter(player => player.busted);
            let loser = getOpponent(winner, socketList);
            io.to(winner.id).emit('win', loser.hand);
            io.to(loser.id).emit('lose', winner.hand);
        }
    }
    if(allStood(socketList)){
        let winnerResult = determineWinner(socketList);
        if(winnerResult == "tie"){
            //io.to('room 1').emit('tie');
            io.to(socketList[0].id).emit('tie', socketList[1].hand);
            io.to(socketList[1].id).emit('tie', socketList[0].hand);
        }
        else if(typeof(winnerResult) == 'number'){
            //console.log("winner type is number, winner id: " + winner.id);
            let winnerIndex = winnerResult;
            let winner = socketList[winnerIndex];
            let loser = getOpponent(winner, socketList);
            io.to(winner.id).emit('win', loser.hand);
            io.to(loser.id).emit('lose', winner.hand);
        }
    }
    // If someone busts when the opponent had already been standing.. ??!!
    if(anyBust(socketList)){
        lastTurn = true;
    }
}

function determineWinner(socketList){
    // Handle empty socketList / room
    if(socketList.length == 0){
        console.log("Cannot determine winner of empty socketList!");
        return;
    }
    // Handle tie at showdown
    let currentlyTied = true;
    for(var i = 1; i < socketList.length; i++){
        if(socketList[i].score != socketList[i-1].score){
            currentlyTied = false;
            break;
        }
    }
    if(currentlyTied){
        return "tie";
    }
    // Return winner (as index of socketList array)
    let currentWinner = 0;
    for(var i = 1; i < socketList.length; i++){
        if(socketList[i].score > socketList[currentWinner].score){
            currentWinner = i;
        }
    }
    console.log("Winner: " + socketList[currentWinner].id);
    return currentWinner;
}

function hit(player, numOfCards = 1){
    // deal a card to player
    for(var i = 0; i < numOfCards; i++){
        console.log("Card hit...");
        let newCard = gameDeck.pop();
        // with updatePoints, player.hand.push(newCard) might be unneeded (if we just update points instead of keeping track of a hand)
        player.hand.push(newCard);
        updateScore(player, newCard);
        // Emit hit event to client, emit opponent hit event to other players in room 1 (there's only 1 tho)
        player.emit('hit', newCard);
        player.to('room 1').emit('opponent hit');
    }
}

function updateScore(player, newCard){
    console.log("Updating score...");
    // If player drew an ace
    if(newCard.Value === "A"){
        player.bigAces++;
    }
    // If a player hits 21 (blackjack)
    if(player.score + newCard.Points == 21){
        player.stood = true;
        console.log(socket.id + " hit 21 (blackjack)!");
    }
    // If player is about to bust
    else if(player.score + newCard.Points > 21){
        if(player.bigAces > 0){
            player.bigAces--;
            player.score -= 10;
        }
        else{
            // Game over - player busted
            console.log("Game over - player busted");
            player.busted = true;
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