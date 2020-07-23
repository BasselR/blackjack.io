const socket = io();

function renderDeck(deck){
    let deckDiv = document.getElementById('deck');
	for(var i = 0; i < deck.getLength(); i++){
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
function joinRoom1(){
	socket.emit('join room 1');
}


// Receivers 
socket.on('render', deck => {
    renderDeck(deck);
});

socket.on('personal', () => {
	console.log("received personal");
});

socket.on('room 1 only', dirName => {
	console.log("Room 1 only message: " + dirName);
});