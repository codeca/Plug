"use strict"

var players = Object.create(null)

var PLAYER_STATE = {
	UNKNOWN:0, 
	LOBBY:1,
	MATCHING:2,
	GAME:3,
	CLOSING:4, //Preparing to close
	CLOSED:5, //Finilize the connection close
}

//Player constructor
function Player(conn){
	
	this.name = ""
	this.playerId = ""
	this.data = null
	this.state = PLAYER_STATE.UNKNOWN
	this._lastSeenId = 0
	this._lastSendedId = 0
	this._timeOut = null
	
	this._lost = false
	
	this.game = null
	//messages contains a raw message with format: 0+Id(2)+Type(2)+MessageSize(2)+Message
	this._messages = []
	//
	this._gameStartId = undefined
	
	this._buffer = new Buffer(0)

	this._conn = conn
	this._conn.on("readable", onreadable(this))
	
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

//Resend old messages
Player.prototype._processResync = function(id){
	var idToSend
	for (idToSend = id; idToSend<this._messages.length;idToSend++){
		this._conn.write(this._messages[idToSend])
	}
}

//Ask for old messages
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

Player.prototype._processMessage = function(type,message){
	//TODO: define types and messages
}

function onreadable(player){
	return function () {
		var buffer = player._conn.read()
		if (buffer) {
			player._buffer = Buffer.concat([player._buffer, buffer],player._buffer.length+buffer.length)
			player._buffer._processBuffer()
		}
	}
}