"use strict"

var matchingRoom = require("./matchingRoom.js")
var messageTypes = require("./messageTypes")

var players = Object.create(null)

module.exports.playerState = PLAYER_STATE
module.exports.newConnection = Player 

var PLAYER_STATE = {
	UNKNOWN:0, //Player did not indentify itself
	LOBBY:1, //Player is in lobby
	MATCHING:2, //Player is looking for a game
	GAME:3, //Player is in game
	CLOSING:4, //Preparing to close
	CLOSED:5, //Finilize the connection close
}

//Player constructor
//Conn = net.socket
function Player(conn){
	console.log("nova conexao")
	this.name = ""
	this.playerId = ""
	this.data = null
	this.state = PLAYER_STATE.UNKNOWN
	this._lastSeenId = 0
	this._timeOut = null
	
	this._lost = false
	
	this.game = null
	//messages contains a raw message with format: 0+Id(2)+Type(2)+MessageSize(2)+Message
	this._messages = []
	this._gameStartId = undefined
	
	this._buffer = new Buffer(0)

	this._conn = conn
	this._conn.on("readable", onreadable(this))
	
}

//Read the player connection and concat in player.buffer then call processBuffer
function onreadable(player){
	return function () {
		var buffer = player._conn.read()
		if (buffer) {
			player._buffer=Buffer.concat([player._buffer,buffer],player._buffer.length+buffer.length)
			player._processBuffer()
		}
	}
}

//Read messages in buffer until it dont have enough buffer to be read
Player.prototype._processBuffer = function(){
	var id, size, type, message
	while(1){
		//No messages
		if (!this._buffer.length) break
		
		//Client asking for resync
		if(this._buffer[0] == 1){
			if (this._buffer.length < 3) break
			id = this._buffer.readUInt16LE(1)
			this._processResync(id)
			this._buffer = this._buffer.slice(3)
		}
		
		//Normal message
		else if(this._buffer[0] == 0){
			if (this._buffer.length < 7) break
			id = this._buffer.readUInt16LE(1)
			type = this._buffer.readInt16LE(3)
			size = this._buffer.readUInt16LE(5)
			if (this._buffer.length < 7+size) break
			
			//Im lost, ask for resync
			if (id > this._lastSeenId + 1){
				if (!this._lost) 
					this._processLostState(this._lastSeenId+1)
			}
			
			//Process normal message
			else if(id == this._lastSeenId + 1){
				this._lost = false
				clearTimeout(this._timeOut)
				message = this._buffer.slice(7,7+size)
				this._processMessage(type,message)
				this._lastSeenId++
			}
			
			this._buffer = this._buffer.slice(7+size)
			
		}
		else{
			//Invalid Message
			this._conn.destroy()
			this.state = PLAYER_STATE.CLOSED
			break
		}
	}
}

//Resend old messages to player
//id: resend messages from 'id' id
//called by processBuffer
Player.prototype._processResync = function(id){
	var idToSend
	for (idToSend = id; idToSend<this._messages.length;idToSend++){
		this._conn.write(this._messages[idToSend])
	}
}

//Ask for old messages
//idToAsk: ask for messages from 'id' idToAsk
//called by processBuffer
Player.prototype._processLostState = function(idToAsk){
	if (this.state == PLAYER_STATE.CLOSED || this.state == PLAYER_STATE.CLOSING) return
	var that = this
	clearTimeout(this._timeOut)
	this._timeOut = setTimeout(function(){
		if (!that._lost) return
		that._processLostState(idToAsk)	
	},5000)
	this._lost = true
	var message = new Buffer(3)
	message[0] = 1
	message.writeUInt16LE(idToAsk,1)
	this._conn.write(message)
}

//Start the message processing
//type = 2 bytes information about the message type
//message = the message
//called by processBuffer
//can call identify, matching, game.broadcast
Player.prototype._processMessage = function(type,message){
			
	if (type == messageTypes.fromClient.IDENTIFICATION){
		this._identify(message)
	}
	else if(type == messageTypes.fromClient.RANDOM_MATCH){
		this._matching(message)		
	}
	else if(type == messageTypes.fromClient.CANCEL_MATCHING){
		this._cancelMatching()
	}
	else if(type >= 0){
		this.game._broadcast(this,message)
	}
	
}

//ProtocolError
//Destroy the conection and log message
//called whenever there is a state problem
Player.prototype._protocolError = function(message){
	console.log(message)
	console.trace()
	this._conn.destroy()
}

//process a indentify message
//save playerId in player
//message contains playerId
//PlayerState.Unkown to PlayerState.Lobby
Player.prototype._identify = function(message){
	if (this.state != PLAYER_STATE.UNKNOWN || message.length != 16){
		this._protocolError("Known player trying to identify again or lenght != 16")
		
	}
	this.state = PLAYER_STATE.LOBBY
	this.playerId = message.toString("hex")
	players[this.playerId] = this
}

//Set the player name and add the player in a matchingRoom
//message = numberOfPlayers + playerName
//PlayerState.Lobby to PlayerState.Matching
//call mathcingRoom.addPlayer
Player.prototype._matching = function(message){
	var numberOfPlayers = message[0]
	if (this.state != PLAYER_STATE.LOBBY)
		this._protocolError("Player not in lobby asking for matching")
	if (!matchingRoom.addPlayer(numberOfPlayers,this))
		this._protocolError("The waiting room asked dont exist")
	
	this.state = PLAYER_STATE.MATCHING
	this.name = message.slice(1).toString()

}

//Player is starting a game
//Set the game to player and send the players informations to this player
//game = Game instance
//playerState.Matching to playerState.Game
Player.prototype._startGame = function(game){
	if (this.state != PLAYER_STATE.MATCHING){
		this._protocolError("player not in matching trying to begin a game")
	}
	this.game = game
	this.state = PLAYER_STATE.GAME
	this._sendProtocolMessage(messageTypes.fromServer.GAME_STARTING,game._playersIdMessage)
}

//Send a standart message to this player (0+id+type+size+message)
//type = one of messageTypeFromServer
//message = message to be sent
Player.prototype._sendProtocolMessage = function(type,message){
	var answer = new Buffer(1+2+2+2+message.length)
	answer[0] = 0
	answer.writeUInt16LE(this._messages.length,1)
	answer.writeInt16LE(type,3)
	answer.writeUInt16LE(message.length,5)
	message.copy(answer,7)
	this._messages.push(answer)
	this._conn.write(answer)
}

//Send a game message to this playe 
//gameMessage = type+size+message
//called by game.broadcast
Player.prototype._sendGameMessage = function(gameMessage){
	var answer = new Buffer(1+2+message.length)
	answer[0] = 0
	answer.writeUInt16LE(this._messages.length,1)
	gameMessage.copy(answer,3)
	this._messages.push(answer)
	this._conn.write(answer)
}

//Cancel the matching for player
//Change state and remove player from matchingRoom
//playerState.matching to playerState.lobby
//call matchingRoom.removePlayer
Player.prototype._cancelMatching = function(){
	if (this.state != PLAYER_STATE.MATCHING){
		this._protocolError("player trying to cancel matching, but he isnt matching")
	}
	if (!matchingRoom.removePlayer(this))
		this._protocolError("the player is not in any waiting room")
	
	this.state = PLAYER_STATE.LOBBY
}


//TODO: onclose, change state and call Game.removePlayer is necessary

