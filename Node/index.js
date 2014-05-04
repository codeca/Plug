"use strict"

var net = require("net")
var Player = require("./player.js")

var server = net.createServer(function(conn){
	new Player(conn)
})

server.listen(8124)