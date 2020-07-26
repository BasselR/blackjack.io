const socket = io();
console.log("beans");

// Emitters 
function requestRoom1(){
	socket.emit('request room 1');
}

function requestHit(){
	socket.emit('hit');
}

function requestStand(){
	socket.emit('stand');
}

// Receivers
socket.on('game over', () => {
	console.log("outside test success!!!");
	document.getElementById('gameOverMsg').innerHTML = "Game over!!!";
});

socket.on('join room 1', () => {
	console.log("You have successfully joined room 1.");
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
});

socket.on('opponent hit', () => {
	let oppHandDiv = document.getElementById('opponentHand');
	let card = document.createElement("div");
	card.className = "card back";
	oppHandDiv.appendChild(card);
});

socket.on('update score', newScore =>{
	let scoreDiv = document.getElementById('scoreDiv');
	scoreDiv.innerHTML = "New score: " + newScore;
});

socket.on('render', deck => {
    renderDeck(deck);
});

socket.on('personal', () => {
	console.log("received personal");
});

socket.on('room 1 only', dirName => {
	console.log("Room 1 only message: " + dirName);
});