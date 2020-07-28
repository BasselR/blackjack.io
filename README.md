# blackjack.io
A fun 2-player twist on the classic Blackjack (21) game using Socket.io and Express.js.
Play against a friend over the internet at [this link](https://blackjack-baz.herokuapp.com/)!

![Mid-round](/pictures/mid-round.png)
![Post-round](/pictures/post-round.png)

## Rules
* Players take alternating turns. On your turn, you can choose to either hit (draw a card) or stand (make your hand final).
* Once a player stands, their opponent can take as many consecutive turns as they'd like until they either stand (showdown) or bust (opponent loses).
* If a player busts (and their opponent has not stood), the opponent is not told. On the opponent's following turn, they can win by standing or hitting without busting. If the opponent hits and busts, then the round is a tie.
* At the end of a round, both players can agree to rematch. The match score is kept track of at the top.