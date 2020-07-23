const socket = io();

function renderDeck(deckObject){
    var deck = deckObject.deck;
    let deckDiv = document.getElementById('deck');
	for(var i = 0; i < deck.length; i++){
        console.log("Hellooo>>?");
		var card = document.createElement("div");
		let spanRank = document.createElement("span");
		spanRank.innerHTML = deck[i].Value;
		spanRank.className = "rank";
		let spanSuit = document.createElement("span");
		spanSuit.innerHTML = deck[i].Suit === "diamonds" ? '&diams;' : '&' + deck[i].Suit + ';';
		spanSuit.className = "suit";
		card.appendChild(spanRank);
		card.appendChild(spanSuit);
        card.className = deck[i].Suit === "diamonds" ? `card rank-${deck[i].Value} diams` : `card rank-${deck[i].Value} ${deck[i].Suit}`;
	    document.getElementById("deck").appendChild(card);
	}
}

socket.on('render', deck => {
    renderDeck(deck);
});