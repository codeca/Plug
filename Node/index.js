"use strict"

var net = require("net")
var player = require("./player.js")

var server = net.createServer(function(conn){
	console.log("conectado")
	player.newConnection(conn)
})

server.listen(8124)