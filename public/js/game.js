const socket = io();
console.log("beans");

var numOfRooms = 3;
var matchScore = 0;
var nickname = "";
var oppStood = false;
var youReady = false;
var oppReady = false;

const myInput = document.getElementById("writeNick");
$('#writeNick').focus();

myInput.addEventListener("keyup", function(event) {
	// 13 === 'enter' key
	if (event.keyCode === 13) {
	  event.preventDefault();
	  setNick();
	}
});

// window.onbeforeunload = function(e) {
// 	return "Are you sure you want to leave the game?";
//   };
  
function setNick(){
	nickname = document.getElementById('writeNick').value;
	socket.emit('set nickname', nickname);
	// $('#first').fadeOut(400, () => {
	// 	console.log("done fading out...");
	// });
	// console.log("fadeout???");
	// $('#second').fadeIn(400);
	$('#first').hide();
	$('#second').show();
}

function revealOpponent(oppHand){
	let oppHandDiv = document.getElementById('opponentHand');
	oppHandDiv.innerHTML = '';
	oppHand.forEach(oppCard => {
		let card = document.createElement("div");
		let spanRank = document.createElement("span");
		spanRank.innerHTML = oppCard.Value;
		spanRank.className = "rank";
		let spanSuit = document.createElement("span");
		spanSuit.innerHTML = `&${oppCard.Suit};`;
		spanSuit.className = "suit";
		card.appendChild(spanRank);
		card.appendChild(spanSuit);
		card.className = `card rank-${oppCard.Value} ${oppCard.Suit}`;
		oppHandDiv.appendChild(card);
	});
}


function setActionBtns(myTurn){
	let buttons = Array.from(document.getElementsByClassName('actions'));
	buttons.forEach(btn => {
		console.log("set action disabled to: " + myTurn);
		if(myTurn){
			btn.removeAttribute('disabled');
		}
		else{
			btn.setAttribute('disabled', "");
		}
	});
}

function resetGame(){
	document.getElementById('gameOverMsg').innerHTML = "";
	document.getElementById('hand').innerHTML = "";
	document.getElementById('opponentHand').innerHTML = "";
	// reset "restart" button visibility and class
	document.getElementById('restart').style.display = 'none';
	document.getElementById('restart').classList.remove('readied');
	oppStood = false;
	youReady = false;
	oppReady = false;
}

// function setTurnText(myTurn){
// 	document.getElementById('turnDiv').textContent = myTurn ? "Your turn" : "Opponent's turn";
// }

// Emitters 
function requestRoom(ele){
	// pass room ID as event parameter
	let roomID = ele.id;
	document.getElementById('lobbyMsg').textContent = "";
	socket.emit('request room', roomID);
}

function leaveGame(){
	if(confirm("Are you sure you want to leave the game?")){
		socket.emit('leave game');
		$('#third').hide();
		$('#second').fadeIn();
		resetGame();
		console.log(`socket room: ${socket.room}`);
		let roomBtns = Array.from(document.getElementsByClassName("roomBtn"));
		roomBtns.forEach(roomBtn => {
			roomBtn.classList.remove("selected");
		});
		//document.getElementById(String(roomNum)).classList.remove("selected");
	}
}

function readyUp(){
	socket.emit('ready');
	document.getElementById('restart').classList.add('readied');
	// if(!ready){
	// 	socket.emit('ready');
	// 	document.getElementById('restart').classList.add('readied');
	// 	ready = true;
	// }
}

function requestHit(){
	socket.emit('hit');
}

function requestStand(){
	socket.emit('stand');
}

function backLobby(){
	// $('#second').fadeOut();
	// $('#first').fadeIn();
	$('#second').hide();
	$('#first').show();
	document.getElementById('writeNick').value = "";
	$('#writeNick').focus();
}

function backLeaderboard(){
	$('#leaderboard').hide();
	$('#second').show();
	document.getElementById('scoreList').innerHTML = "";
}

function requestLeaderboard(){
	socket.emit('request leaderboard');
}

// Receivers

socket.on('leaderboard', entries => {
	// create html ordered list element from input, add it to div
	console.log(entries);
	let leaderboardDiv = document.getElementById('scoreList');
	let ol = document.createElement("ol");
	entries.forEach(entry => {
		let li = document.createElement("li");
		li.textContent = `${entry.name} - ${entry.score}`;
		li.className = "entry";
		if(entry.name == nickname){
			li.classList.add("highlight");
		}
		ol.appendChild(li);
	});
	leaderboardDiv.appendChild(ol);
	$('#second').hide();
	$('#leaderboard').show();
});

socket.on('turn update', myTurn => {
	setActionBtns(myTurn);
	// setTurnText(myTurn);
});

socket.on('start game', () => {
	$('#second').hide();
	$('#third').fadeIn();
});

socket.on('room full', () => {
	document.getElementById('lobbyMsg').textContent = "That room is full!";
});

// On game restart
socket.on('restart', () => {
	// Reset divs to initial state
	console.log("Receiving match restart event.");
	resetGame();
	// ready = false;
});

socket.on('you ready', () => {
	if(!oppReady && !youReady){
		let matchScoreDiv = document.getElementById('matchScoreDiv');
		matchScoreDiv.innerHTML = '<i id="replayIcon" class="fas fa-redo-alt"></i>' + matchScoreDiv.innerHTML;
	}
	youReady = true;
});

socket.on('opponent ready', () => {
	if(!youReady && !oppReady){
		let matchScoreDiv = document.getElementById('matchScoreDiv');
		matchScoreDiv.innerHTML += '<i id="replayIcon" class="fas fa-redo-alt"></i>';
	}
	oppReady = true;
});

socket.on('game over', matchScoreObj => {
	console.log('game over event received...');
	// formatting for object: matchScoreObj = {matchScore, scoreText}
	document.getElementById('matchScoreDiv').textContent = matchScoreObj.matchScore;
	document.getElementById('scoreDiv').innerHTML = matchScoreObj.scoreText;
	document.getElementById('restart').style.display = 'inline-block';
	setActionBtns(false);
});

socket.on('match score', matchScore => {
	console.log('match score event received...');
	let matchScoreDiv = document.getElementById('matchScoreDiv');
	matchScoreDiv.textContent = matchScore;
});

socket.on('tie', opponentHand => {
	console.log("Receiving tie event!");
	revealOpponent(opponentHand);
	document.getElementById('gameOverMsg').innerHTML = "You Tied!";
	document.getElementById('gameOverMsg').style.color = "blue";
	document.getElementById('turnDiv').textContent = "";
});

socket.on('win', opponentHand => {
	console.log("Receiving win event!");
	revealOpponent(opponentHand);
	document.getElementById('gameOverMsg').innerHTML = "You won!";
	document.getElementById('gameOverMsg').style.color = "green";
	document.getElementById('turnDiv').textContent = "";
})

socket.on('lose', opponentHand => {
	console.log("Receiving lose event!");
	revealOpponent(opponentHand);
	document.getElementById('gameOverMsg').innerHTML = "You lost!";
	document.getElementById('gameOverMsg').style.color = "red";
	document.getElementById('turnDiv').textContent = "";
})

socket.on('join room', roomID => {
	console.log(`You have successfully joined room ${roomID}.`);
	console.log(document.getElementById(String(roomID)).classList);
	document.getElementById(String(roomID)).classList.add("selected");
	for(var i = 1; i <= numOfRooms; i++){
		if(i != roomID){
			document.getElementById(String(i)).classList.remove("selected");
		}
	}
});

socket.on('init turn', myTurn => {
	// let button = document.getElementsByClassName('actions')[0];
	// console.log('buttom ndisabled attribute: ' + button.getAttribute('disabled'));

	// if(!myTurn){
	// 	toggleActionBtns();
	// }
	console.log('receiving init turn event');
	setActionBtns(myTurn);
	// setTurnText(myTurn);
});

socket.on('hit', newCard =>{
	console.log("Receiving 'hit' event with new card:", newCard);
	let handDiv = document.getElementById('hand');
	let card = document.createElement("div");
	let spanRank = document.createElement("span");
	spanRank.innerHTML = newCard.Value;
	spanRank.className = "rank";
	let spanSuit = document.createElement("span");
	spanSuit.innerHTML = `&${newCard.Suit};`;
	spanSuit.className = "suit";
	card.appendChild(spanRank);
	card.appendChild(spanSuit);
	card.className = `card rank-${newCard.Value} ${newCard.Suit}`;
	handDiv.appendChild(card);
	// if(!oppStood){
	// 	document.getElementById('turnDiv').textContent = "Opponent's turn";
	// }
	// toggleActionBtns();
});

socket.on('opponent hit', () => {
	let oppHandDiv = document.getElementById('opponentHand');
	let card = document.createElement("div");
	card.className = "card back";
	oppHandDiv.appendChild(card);
	// document.getElementById('turnDiv').textContent = "Your turn";
	// toggleActionBtns();
});

socket.on('stand', () => {
	// document.getElementById('turnDiv').textContent = "Opponent's turn";
	// toggleActionBtns();
});

socket.on('opponent stand', () => {
	oppStood = true;
	// document.getElementById('turnDiv').textContent = "Your turn";
	// toggleActionBtns();
});

// scores is a js object either carries both scores (if game over) or just your score
socket.on('update score', score =>{
	let scoreDiv = document.getElementById('scoreDiv');
	scoreDiv.innerHTML = "Your score: " + score;
	//console.log("opp score: " + scores.oppScore);
	// if(scores.oppScore){
	// 	scoreDiv.innerHTML = "Your score: " + scores.yourScore + " | Opponent's score: " + scores.oppScore;
	// }
	// else{
	// 	scoreDiv.innerHTML = "Your score: " + scores.yourScore;
	// }
});

// bundle has properties: roomID, roomCount, players
socket.on('room count', bundle => {
	let roomID = bundle.roomID;
	let roomCount = bundle.roomCount;
	let players = bundle.players;
	
	console.log(`room count for room ${roomID}: ${roomCount}`);
	document.getElementById(`room${roomID}Count`).textContent = `${roomCount} / 2`;

	let tooltip = document.getElementById(`tool${roomID}`);
	if(roomCount == 0){
		tooltip.style.display = "none";
	}
	else{
		tooltip.style.display = "inline";
	}

	tooltip.textContent = '';
	if(players){
		for(var i = 0; i < players.length; i++){
			tooltip.textContent += players[i];
			if(i != players.length - 1){
				tooltip.textContent += '\r\n';
			}
		}
	}
});

socket.on('left room', roomNum => {
	console.log("Someone left the room you're in.");
	alert("Your opponent left the room! You've been brought back to the lobby.");
	$('#third').hide();
	$('#second').fadeIn();
	document.getElementById(String(roomNum)).classList.remove("selected");
	resetGame();
});

socket.on('bruh', players => {
	if(players) console.log("players is defined! :)");
});