const socket = io();
console.log("beans");
// console.log(socket.id);

function renderDeck(deck){
	let deckDiv = document.getElementById('deck');
	console.log(deck);
	for(var i = 0; i < deck.deck.length; i++){
        console.log("Good morning !>>?");
		let card = document.createElement("div");
		let spanRank = document.createElement("span");
		spanRank.innerHTML = deck.card[i].Value;
		spanRank.className = "rank";
		let spanSuit = document.createElement("span");
		spanSuit.innerHTML = deck.card[i].Suit === "diamonds" ? '&diams;' : '&' + deck.card[i].Suit + ';';
		spanSuit.className = "suit";
		card.appendChild(spanRank);
		card.appendChild(spanSuit);
        card.className = deck.card[i].Suit === "diamonds" ? `card rank-${deck.card[i].Value} diams` : `card rank-${deck.card[i].Value} ${deck.card[i].Suit}`;
	    deckDiv.appendChild(card);
	}
}

// Emitters 
function requestRoom1(){
	socket.emit('request room 1');
}

function requestHit(){
	socket.emit('hit');
}

// Receivers
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
	spanSuit.innerHTML = newCard.Suit === "diamonds" ? '&diams;' : '&' + newCard.Suit + ';';
	spanSuit.className = "suit";
	card.appendChild(spanRank);
	card.appendChild(spanSuit);
	card.className = newCard.Suit === "diamonds" ? `card rank-${newCard.Value} diams` : `card rank-${newCard.Value} ${newCard.Suit}`;
	handDiv.appendChild(card);
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