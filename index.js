const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./db/MongoConnect');
const Score = require('./models/ScoreSchema');

// DeckModule's other exports are .values, .suits and .points
const Deck = require('./DeckModule').Deck;

app.use(express.static(path.join(__dirname, 'public')));

var allPlayers = {};
const numOfRooms = 3;

connectDB();

io.on('connection', socket => {
    console.log(socket.id + " joined.");
    allPlayers[socket.id] = socket;

    emitRoomCount();

    // Attempt to join room 1 (if there is space)
    socket.on('set nickname', nickname => {
        console.log(`Nickname: ${socket.id} -> ${nickname}`);
        socket.nick = nickname;
    });
    socket.on('request room', roomID => {
        console.log(`${socket.id} requesting to join room ${roomID}.`);
        let roomName = 'room ' + roomID;
        let room = getRoom(roomID);
        if(room && room.roomPlayers && inRoom(socket, room.roomPlayers)){
            console.log("Duplicate room-join attempt by " + socket.id);
        }
        else if(!room || room.length < 2){
            socket.join(roomName, () => {
                room = getRoom(roomID);
                console.log(`${socket.id} has successfully joined ${roomName}.`);
                socket.room = roomID;

                console.log('forloop rrom length: ' + Object.keys(io.sockets.adapter.rooms).length);
                for(var i = 1; i <= Object.keys(io.sockets.adapter.rooms).length; i++){
                    let roomName = 'room ' + i;
                    console.log('forloop roomID: ' + roomID);
                    if(i != roomID){
                        socket.leave(roomName, () => {
                            console.log(`${socket.id} has successfully left ${roomName}.`);
                        });
                    }
                }

                if(!room.roomPlayers){
                    room.roomPlayers = [];
                }

                socket.matchScore = 0;
                room.roomPlayers.push(socket);

                // socket.emit(`join ${roomName}`);
                socket.emit('join room', roomID);
                
                emitRoomCount();

                if(room.length == 2){
                    // Second player has successfully joined, start this room's game
                    io.to(roomName).emit('start game');
                    // Initialize p1Bool
                    room.p1Bool = true;
                    initGame(roomID);
                }
            });
        }
        else{
            console.log(socket.id + ` cannot join ${roomName} (full).`);
            socket.emit('room full');
        }
    });
    // Hit
    socket.on('hit', () => {
        let room = getRoom(socket.room);
        if(socket.p1 == room.p1Turn){
            hit(socket);
            if(!getOpponent(socket, room.roomPlayers).stood){
                room.p1Turn = !room.p1Turn;
            }
            updateTurn(socket.room);
        }
        else{
            console.log(socket.nick + " tried to hit but it's not their turn.");
        }
        checkGameOver(socket.room);
    });
    // Stand
    socket.on('stand', () => {
        let room = getRoom(socket.room);
        // let roomName = 'room ' + socket.room;
        // let room = io.sockets.adapter.rooms[roomName];
        if(socket.p1 == room.p1Turn){
            stand(socket);
            room.p1Turn = !room.p1Turn;
            updateTurn(socket.room);
        }
        else{
            console.log(socket.nick + " tried to stand but it's not their turn.");
        }
        checkGameOver(socket.room);
    });
    // Ready up (for restart)
    socket.on('ready', () => {
        let roomName = 'room ' + socket.room;
        let room = io.sockets.adapter.rooms[roomName];
        console.log(socket.id + " is readying up!");
        socket.ready = true;
        io.to(socket.id).emit('you ready');
        io.to(getOpponent(socket, room.roomPlayers).id).emit('opponent ready');
        if(checkBothReady(room.roomPlayers)){
            console.log("Both players are ready. Game restarting...");
            io.to(roomName).emit('restart');
            // sending room ID so initGame() can access the room object
            initGame(socket.room);
        }
    });
    // Request leaderboard
    socket.on('request leaderboard', () => {
        Score.find().sort({score: -1}).limit(5).exec( 
            function(err, scores) {
                if(err){
                    console.log("Error while retrieving leaderboard: " + err);
                }
                else{
                    console.log("Successfully retrieved leaderboard!");
                    socket.emit('leaderboard', scores);
                }
            }
        );
    });

    // Disconnect
    socket.on('disconnect', discMsg => {
        console.log(socket.id + " disconnected.");
        delete allPlayers[socket.id];
        let room = getRoom(socket.room);
        // Remove the disconnected player from room 1 players and update population
        if(room && room.roomPlayers){
            room.roomPlayers = room.roomPlayers.filter(player => player.id == socket.id);
        }
        emitRoomCount();
        let roomName = 'room ' + socket.room;
        io.to(roomName).emit('left room');
    });
});

function getRoom(roomID){
    return io.sockets.adapter.rooms[`room ${roomID}`];
}

// Updates the client about the state of their turn. Happens every time someone hits / stands
function updateTurn(roomID){
    let room = getRoom(roomID);
    let socketList = room.roomPlayers;
    for(var i = 0; i < socketList.length; i++){
        io.to(socketList[i].id).emit('turn update', socketList[i].p1 == room.p1Turn);
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
function initGame(roomID){
    console.log(`Initializing game for room ${roomID}...`);
    let roomName = 'room ' + roomID;
    let room = io.sockets.adapter.rooms[roomName];
    room.gameDeck = new Deck();
    room.gameDeck.shuffle();
    room.lastTurn = false;
    room.p1Turn = true;
    room.gameOver = false;

    let players = room.roomPlayers;

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
    room.p1Bool = !room.p1Bool;
    players[0].p1 = room.p1Bool;
    players[1].p1 = !room.p1Bool;

    // Tell the players who's turn it is to start off
    players[0].emit('init turn', players[0].p1);
    players[1].emit('init turn', players[1].p1);

    emitMatchScore(roomID);
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

// Checks if game is over (which 'game over' case is logged)
function checkGameOver(roomID){
    let roomName = 'room ' + roomID;
    let room = io.sockets.adapter.rooms[roomName];
    let socketList = room.roomPlayers;
    console.log("checking game over, last turn: " + room.lastTurn);
    if(room.lastTurn){
        // Both players bust
        if(allBust(socketList)){
            console.log("Game over - case 1.");
            room.gameOver = true;
            emitTie(roomID);
        }
        // One player busts, other player gets last turn and doesn't bust
        else{
            console.log("Game over - case 2.");
            let winner = socketList.filter(player => !player.busted)[0];
            room.gameOver = true;
            emitWinLoss(winner, roomID);
            console.log("winner id: " + winner.id);
        }
    }
    // If someone busts when the opponent had already been standing
    else if(anyBust(socketList)){
        if(anyStood(socketList)){
            room.gameOver = true;
            let winner = socketList.filter(player => !player.busted)[0];
            console.log("Game over - case 3.");
            console.log("winner id: " + winner.id);
            emitWinLoss(winner, roomID);
        }
        // Someone busts, activating final turn
        else{
            room.lastTurn = true;
        }
    }
    else if(allStood(socketList)){
        let winnerResult = determineWinner(socketList);
        // Both players stand, score tied
        if(winnerResult == "tie"){
            console.log("Game over - case 4.");
            room.gameOver = true;
            emitTie(roomID);
        }
        // Both players stand, showdown
        else if(typeof(winnerResult) == 'number'){
            let winnerIndex = winnerResult;
            let winner = socketList[winnerIndex];
            console.log("Game over - case 5.");
            console.log("winner id: " + winner.id);
            room.gameOver = true;
            emitWinLoss(winner, roomID);
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
    // Returns winner's index (with respect to socketList array)
    return currentWinner;
}

function emitTie(roomID){
    console.log("emitTie event fired");
    let room = getRoom(roomID);
    let socketList = room.roomPlayers;
    // these dont actually represent 'p1' / who goes first, they're just placeholder names
    let p1 = socketList[0];
    let p2 = socketList[1];
    p1.matchScore += 0.5;
    p2.matchScore += 0.5;
    io.to(p1.id).emit('tie', p2.hand);
    io.to(p2.id).emit('tie', p1.hand);
    emitMatchScore(roomID);
    updateDatabase(p1, 0.5);
    updateDatabase(p2, 0.5);
}

function emitWinLoss(winner, roomID){
    console.log("emitWinLoss event fired");
    let room = getRoom(roomID);
    let socketList = room.roomPlayers;
    winner.matchScore++;
    let loser = getOpponent(winner, socketList);
    io.to(winner.id).emit('win', loser.hand);
    io.to(loser.id).emit('lose', winner.hand);
    emitMatchScore(roomID);
    updateDatabase(winner, 1);
}

function emitMatchScore(roomID){
    console.log("emitMatchScore event fired");
    let room = getRoom(roomID);
    let socketList = room.roomPlayers;
    // these dont actually represent 'p1' / who goes first, they're just placeholder names
    let p1 = socketList[0];
    let p2 = socketList[1];

    let p1MS = `${p1.nick}: ${p1.matchScore} | ${p2.nick}: ${p2.matchScore}`;
    let p2MS = `${p2.nick}: ${p2.matchScore} | ${p1.nick}: ${p1.matchScore}`;

    let p1S = `Your score: ${p1.score} &nbsp;&nbsp; | &nbsp;&nbsp; Opponent's score: ${p2.score}`;
    let p2S = `Your score: ${p2.score} &nbsp;&nbsp; | &nbsp;&nbsp; Opponent's score: ${p1.score}`;
    
    console.log(`room.gameOver: ${room.gameOver}`);
    console.log(`p1.id: ${p1.id}`);
    // sending client the opponent's hand score
    if(room.gameOver){
        io.to(p1.id).emit('game over', {matchScore: p1MS, scoreText: p1S} );
        io.to(p2.id).emit('game over', {matchScore: p2MS, scoreText: p2S} );
    }
    else{
        io.to(p1.id).emit('match score', p1MS);
        io.to(p2.id).emit('match score', p2MS);
    }
}

function emitRoomCount(roomID = null){
    if(!roomID){ 
        //console.log("EMIT ROOM COUNT ROOMS LNGTH: " + Object.keys(io.sockets.adapter.rooms).length);
        for(var i = 1; i <= numOfRooms; i++){
            let room = getRoom(i);
            if(room && room.roomPlayers){
                io.emit('room count', { roomID: i, roomCount: room.length });
            }
            else{
                io.emit('room count', { roomID: i, roomCount: 0 });
            }
        }
    }
    else{
        let room = getRoom(roomID);
        io.emit('room count', { roomID, roomCount: room.length });
    }
}

function hit(player, numOfCards = 1){
    // deal a card to player
    let roomName = 'room ' + player.room;
    let room = io.sockets.adapter.rooms[roomName];
    for(var i = 0; i < numOfCards; i++){
        console.log("Card hit...");
        let newCard = room.gameDeck.pop();
        // with updatePoints, player.hand.push(newCard) might be unneeded (if we just update points instead of keeping track of a hand)
        player.hand.push(newCard);
        updateScore(player, newCard);
        // Emit hit event to client, emit opponent hit event to other players in room 1 (there's only 1 tho)
        player.emit('hit', newCard);
        player.to(roomName).emit('opponent hit');
    }
}

function stand(player){
    let roomName = 'room ' + player.room;
    player.stood = true;
    console.log(player.id + " stands.")
    player.emit('stand');
    player.to(roomName).emit('opponent stand');
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
            player.emit('busted');
        }
    }
    player.score += newCard.Points;
    player.emit('update score', player.score);
}

// Returns whether or not a player is in a 'room' (list of sockets)
function inRoom(player, socketList){
    //console.log("inRoom --- socketList.length: " + socketList.length);
    for(var i = 0; i < socketList.length; i++){
        if(socketList[i].id == player.id){
            return true;
        }
    }
    return false;
}

function updateDatabase(player, scoreIncrement){
    let query = {name: player.nick};
    let options = {new: true, upsert: true, setDefaultsOnInsert: true};

    Score.findOneAndUpdate(query, {$inc : {'score' : scoreIncrement}}, options, function(err, results){
        if(err){
            console.log("Error during findOneAndUpdate: " + err);
        }
        else{
            console.log("findOneAndUpdate successful: " + results);
        }
    });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Listening on port %d", PORT);
});