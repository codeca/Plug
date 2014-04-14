"use strict"

var messageTypes = require("./messageTypes.js")

var waitingPlayers = {
	"2": [],
	"3": [],
	"4": [],
}


module.exports.removePlayer = waitingPlayers.removePlayer
module.exports.addPlayer = waitingPlayers.addPlayer

//Romove a player from the waiting room
//player is a Player instance
//Return true if successfully removed the player
waitingPlayers.removePlayer = function (player){
	for (var waitingRoom in waitingPlayers){
		var pos = waitingPlayers[waitingRoom].indexOf(player)
		if (pos != -1){
			waitingPlayers[waitingRoom].splice(pos,1)
			sendUpdatePlayers(waitingPlayers[waitingRoom])
			return true
		}
	}
	return false
}

//Add a player in the waiting room
//key is the number of players the player wants in the game
//player is a Player instance
//Return true if successfully added the player
waitingPlayers.addPlayer = function (key,player){
	if (!waitingPlayers[key]) return false
	waitingPlayers[key].push(player)
	if (waitingPlayers[key].length == key){
		//TODO: begin game
	}
	else{
		sendUpdatePlayers(waitingPlayers[key])
	}
}

var sendUpdatePlayers = function(players){
	var answer
	players.forEach(function(each){
		answer = new Buffer(8)
		answer[0] = 0
		answer.writeUInt16LE(this._messages.length,1)
		answer.writeInt16LE(messageTypes.fromServer.UPDATE_MATCHING,3)
		answer.writeUInt16LE(1,5)
		answer[7] = players.length
		each._sendStandartMessage(answer)
	})
}