const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

// DeckModule's other exports are .values, .suits and .points
const Deck = require('./DeckModule').Deck;

app.use(express.static(path.join(__dirname, 'public')));

var players = [];
var room1Players = [];
var room1Population = 0;
var gameDeck;
var p1Turn = true;
var p1Bool = true;
var lastTurn = false;
var gameOver = false;

setInterval(function(){
    console.log(room1Population);
}, 3000);

io.on('connection', socket => {
    console.log(socket.id + " joined.");
    //console.log(players);
    players.push(socket.id);
    console.log(players);
    // Attempt to join room 1 (if there is space)
    socket.on('set nickname', nickname => {
        socket.nick = nickname;
    });
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
                    socket.matchScore = 0;
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
            socket.emit('room full');
        }
    });
    // Hit
    socket.on('hit', () => {
        if(socket.p1 == p1Turn){
            hit(socket);
            if(!getOpponent(socket, room1Players).stood){
                p1Turn = !p1Turn;
            }
            updateTurn(room1Players);
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
            stand(socket);
            p1Turn = !p1Turn;
            updateTurn(room1Players);
        }
        // else if(socket.stood){
        //     console.log(socket.id + " tried to hit but they've already stood!");
        // }
        else{
            console.log(socket.nick + " tried to stand but it's not their turn.");
        }
        checkGameOver(room1Players);
    });
    // Ready up (for restart)
    socket.on('ready', () => {
        console.log(socket.id + " is readying up!");
        socket.ready = true;
        if(checkBothReady(room1Players)){
            console.log("Both players are ready. Game restarting...");
            io.to('room 1').emit('restart');
            initGame(room1Players);
        }
    });
    // Disconnect
    socket.on('disconnect', discMsg => {
        console.log(socket.id + " disconnected.");
        // Remove the disconnected player from room 1 players and update population
        room1Players = room1Players.filter(player => player.id == socket.id);
        room1Population = room1Players.length;
    });
});

// Updates the client about the state of their turn. Happens every time someone hits / stands
function updateTurn(socketList){
    for(var i = 0; i < socketList.length; i++){
        io.to(socketList[i].id).emit('turn update', socketList[i].p1 == p1Turn);
    }
}

// Determines whether or not both players in the socketList are ready for rematch
function checkBothReady(socketList){
    for(var i = 0; i < socketList.length; i++){
        if(!socketList[i].ready){
            return false;
        }
    }
    return true;
}

// Takes in an array of players (sockets)
function initGame(players){
    console.log("Init game...");
    gameDeck = new Deck();
    gameDeck.shuffle();
    lastTurn = false;
    p1Turn = true;
    gameOver = false;

    players.forEach((player) => {
        player.score = 0;
        player.bigAces = 0;
        player.stood = false;
        player.busted = false;
        player.ready = false;
        // player hand might turn out to be unneccessary thanks to updating score instead
        player.hand = new Array();
        hit(player, 2);
    });

    // These 3 lines try to alternate who starts
    p1Bool = !p1Bool;
    players[0].p1 = p1Bool;
    players[1].p1 = !p1Bool;

    // Tell the players who's turn it is to start off
    players[0].emit('init turn', players[0].p1);
    players[1].emit('init turn', players[1].p1);

    emitMatchScore(players);
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

function anyStood(socketList){
    for(var i = 0; i < socketList.length; i++){
        if(socketList[i].stood){
            return true;
        }
    }
    return false;
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
    if(lastTurn){
        // Both players bust
        if(allBust(socketList)){
            console.log("last turn true, all bust true");
            gameOver = true;
            emitTie(socketList);
        }
        // One player busts, other player gets last turn and doesn't bust
        else{
            console.log("last turn true, all bust false");
            gameOver = true;
            let winner = socketList.filter(player => !player.busted)[0];
            emitWinLoss(winner, socketList);
            console.log("winner id: " + winner.id);
        }
    }
    if(allStood(socketList)){
        let winnerResult = determineWinner(socketList);
        // Both players stand, score tied
        if(winnerResult == "tie"){
            gameOver = true;
            emitTie(socketList);
        }
        // Both players stand, showdown
        else if(typeof(winnerResult) == 'number'){
            //console.log("winner type is number, winner id: " + winner.id);
            gameOver = true;
            let winnerIndex = winnerResult;
            let winner = socketList[winnerIndex];
            emitWinLoss(winner, socketList);
        }
    }
    // If someone busts when the opponent had already been standing
    if(anyBust(socketList)){
        if(anyStood(socketList)){
            gameOver = true;
            let winner = socketList.filter(player => !player.busted)[0];
            console.log("winner id: " + winner.id);
            emitWinLoss(winner, socketList);
        }
        // Someone busts, activating final turn
        else{
            lastTurn = true;
        }
    }
}

// For determining the winner of a showdown
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

function emitTie(socketList){
    socketList[0].matchScore += 0.5;
    socketList[1].matchScore += 0.5;
    io.to(socketList[0].id).emit('tie', socketList[1].hand);
    io.to(socketList[1].id).emit('tie', socketList[0].hand);
    emitMatchScore(socketList);
}

function emitWinLoss(winner, socketList){
    winner.matchScore++;
    let loser = getOpponent(winner, socketList);
    io.to(winner.id).emit('win', loser.hand);
    io.to(loser.id).emit('lose', winner.hand);
    emitMatchScore(socketList);
}

function emitMatchScore(socketList){
    // these dont actually represent 'p1' / who goes first, they're just placeholder names
    let p1 = socketList[0];
    let p2 = socketList[1];
    let p1MS = `${p1.nick}: ${p1.matchScore} | ${p2.nick}: ${p2.matchScore}`;
    let p2MS = `${p2.nick}: ${p2.matchScore} | ${p1.nick}: ${p1.matchScore}`;
    
    // sending client the opponent's hand score
    if(gameOver){
        io.to(p1.id).emit('game over', {matchScore: p1MS, oppScore: p2.score} );
        io.to(p2.id).emit('game over', {matchScore: p2MS, oppScore: p1.score} );
    }
    else{
        io.to(p1.id).emit('match score', p1MS);
        io.to(p2.id).emit('match score', p2MS);
    }
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

function stand(player){
    player.stood = true;
    console.log(player.id + " stands.")
    player.emit('stand');
    player.to('room 1').emit('opponent stand');
}

function updateScore(player, newCard){
    console.log("Updating score...");
    console.log("new card: " + newCard.Value);
    // If player drew an ace
    if(newCard.Value === "A"){
        player.bigAces++;
    }
    // If a player hits 21 (blackjack)
    if(player.score + newCard.Points == 21){
        //player.stood = true;
        console.log(player.id + " hit 21 (blackjack)!");
    }
    // If player is about to bust
    else if(player.score + newCard.Points > 21){
        if(player.bigAces > 0){
            player.bigAces--;
            player.score -= 10;
        }
        else{
            // Game over - player busted
            console.log(player.id + " busted.");
            player.busted = true;
            //something like: player.emit('busted')
        }
    }
    player.score += newCard.Points;
    player.emit('update score', player.score);
    // hard coded for room 1
    // let opp = getOpponent(player, room1Players);
    // player.score += newCard.Points;
    // if(gameOver){
    //     player.emit('update score', { yourScore: player.score, oppScore: opp.score });
    // }
    // else{
    //     player.emit('update score', { yourScore: player.score });
    // }
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