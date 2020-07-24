var suits = ["spades", "diamonds", "clubs", "hearts"];
var values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
var points = {"2":2, "3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "J":10, "Q":10, "K":10, "A":11};

class Deck{

    constructor(){
        this.deck = new Array();
        for(let i = 0; i < suits.length; i++){
            for(let j = 0; j < values.length; j++){
                let card = {Value: values[j], Suit: suits[i], Points: points[values[j]]};
                this.deck.push(card);
            }
        }
    }

    // Fischer-Yates in-place shuffle
    shuffle(){
        let i, j, tmp;
        for (i = this.deck.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            tmp = this.deck[i];
            this.deck[i] = this.deck[j];
            this.deck[j] = tmp;
        }
    }

    card(i){
        return this.deck[i];
    }

    getLength(){
        return this.deck.length;
    }

    pop(){
        return this.deck.pop();
    }

    // Returns new length of array
    push(card){
        return this.deck.push(card);
    }

    // Temorarily breaking encapsulation
    getArray(){
        return this.deck;
    }
}

exports.suits = suits;
exports.values = values;
exports.points = points;
exports.Deck = Deck;