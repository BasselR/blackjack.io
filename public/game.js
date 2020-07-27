const socket = io();
console.log("beans");

var matchScore = 0;
var nickname = "";
var oppStood = false;

const myInput = document.getElementById("writeNick");
$('#writeNick').focus();

myInput.addEventListener("keyup", function(event) {
	// 13 === 'enter' key
	if (event.keyCode === 13) {
	  event.preventDefault();
	  setNick();
	}
});
  
function setNick(){
	nickname = document.getElementById('writeNick').value;
	socket.emit('set nickname', nickname);
	$('#first').fadeOut();
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

// function toggleActionBtns(){
// 	let buttons = Array.from(document.getElementsByClassName('actions'));
// 	buttons.forEach(btn => {
// 		console.log("disbaling????");
// 		btn.toggleAttribute('disabled');
// 	});
// }

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

function setTurnText(myTurn){
	document.getElementById('turnDiv').textContent = myTurn ? "Your turn" : "Opponent's turn";
}

// Emitters 
function requestRoom1(){
	socket.emit('request room 1');
}

function readyUp(){
	socket.emit('ready');
}

function requestHit(){
	socket.emit('hit');
}

function requestStand(){
	socket.emit('stand');
}

// Receivers

socket.on('turn update', myTurn => {
	setActionBtns(myTurn);
	setTurnText(myTurn);
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
	document.getElementById('gameOverMsg').innerHTML = "";
	document.getElementById('hand').innerHTML = "";
	document.getElementById('opponentHand').innerHTML = "";
	oppStood = false;
});

socket.on('game over', matchScoreObj => {
	console.log('game over event received...');
	// formatting for object: matchScoreObj = {matchScore, oppScore}
	document.getElementById('matchScoreDiv').textContent = matchScoreObj.matchScore;
	scoreDiv.innerHTML = scoreDiv.innerHTML + " | Opponent's score: " + matchScoreObj.oppScore;
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
	document.getElementById('turnDiv').textContent = "";
});

socket.on('win', opponentHand => {
	console.log("Receiving win event!");
	revealOpponent(opponentHand);
	document.getElementById('gameOverMsg').innerHTML = "You won!";
	document.getElementById('turnDiv').textContent = "";
})

socket.on('lose', opponentHand => {
	console.log("Receiving lose event!");
	revealOpponent(opponentHand);
	document.getElementById('gameOverMsg').innerHTML = "You lost!";
	document.getElementById('turnDiv').textContent = "";
})

socket.on('join room 1', () => {
	console.log("You have successfully joined room 1.");
});

socket.on('init turn', myTurn => {
	// let button = document.getElementsByClassName('actions')[0];
	// console.log('buttom ndisabled attribute: ' + button.getAttribute('disabled'));

	// if(!myTurn){
	// 	toggleActionBtns();
	// }
	console.log('receiving init turn event');
	setActionBtns(myTurn);
	setTurnText(myTurn);
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