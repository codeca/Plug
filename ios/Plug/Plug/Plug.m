//
//  Plug.m
//  Plug
//
//  Created by Guilherme Souza on 4/23/14.
//  Copyright (c) 2014 Sitegui. All rights reserved.
//

#import "Plug.h"
#import "PlugSocket.h"
#define write16(bytes, value, offset) ((bytes)[(offset)] = (value)>>8, (bytes)[(offset)+1] = (value) & 0xFF)
#define read16(bytes, offset) ((bytes)[(offset)]<<8 | (bytes)[(offset)+1])

enum : SInt16 {
	PLUG_CLIENT_MSG_HELLO = -1, // PLUG_STATE_CONNECTING
	PLUG_CLIENT_MSG_RANDOM_MATCH = -2, // PLUG_STATE_LOBBY
	PLUG_CLIENT_MSG_CANCEL_MATCH = -3, // PLUG_STATE_RANDOM_MATCHING
	
	PLUG_SERVER_MSG_MATCHING_UPDATE = -21, // PLUG_STATE_RANDOM_MATCHING
	PLUG_SERVER_MSG_GAME_START = -22, // PLUG_STATE_RANDOM_MATCHING
	PLUG_SERVER_MSG_PLAYER_DISCONNECT = -23 // PLUG_STATE_IN_GAME
};

@interface Plug()<PlugSocketDelegate> {
	PlugSocket* socket;
	NSData* playerId;
	NSMutableArray* sentMessages; // array of NSData of sent messages
	UInt16 lastSeenId;
	UInt16 lastSentId;
	NSMutableData* readCache;
	UInt8 matchingPlayersGoal;
}

@property (nonatomic, readwrite) PlugState state;
@property (nonatomic, readwrite) UInt16 version;

@end

@implementation Plug

- (instancetype)initWithHost:(NSString *)host port:(UInt32)port andAppVersion:(UInt16)version {
	if (self = [super init]) {
		// Generate player id
		UInt8 bytes[16];
		arc4random_buf(bytes, 16);
		playerId = [NSData dataWithBytes:bytes length:16];
		
		socket = [[PlugSocket alloc] initWithHost:host andPort:port];
		socket.delegate = self;
		
		self.version = version;
	}
	return self;
}

- (void)startRandomMatchWithName:(NSString *)name andPlayers:(UInt8)players {
	if (self.state != PLUG_STATE_LOBBY)
		[[NSException exceptionWithName:@"InvalidState" reason:@"Must be in PLUG_STATE_LOBBY" userInfo:nil] raise];
	
	UInt8 header[1] = {players};
	NSMutableData* message = [NSMutableData dataWithBytes:header length:1];
	NSData* nameBytes = [name dataUsingEncoding:NSUTF8StringEncoding];
	if (nameBytes.length >= 256)
		[[NSException exceptionWithName:@"InvalidArgument" reason:@"Name must be shorter than 256 bytes" userInfo:nil] raise];
	[message appendData: nameBytes];
	
	[self sendMessage:message withType:PLUG_CLIENT_MSG_RANDOM_MATCH];
	self.state = PLUG_STATE_RANDOM_MATCHING;
	matchingPlayersGoal = players;
}

- (void)cancelMatching {
	// TODO
}

- (void)sendGameMessage:(id)message withType:(UInt16)type {
	// TODO
}

- (void)close {
	// TODO
}

#pragma mark - error

// Indicates a protocol error
- (void)closeWithError:(NSString*)details {
	[self close];
	NSLog(@"<Plug>: protocol error:\n%@", details);
}

#pragma mark - plug socket delegate

- (void)plugSocketDidOpen:(PlugSocket *)plugSocket {
	// Send hello message
	UInt8 bytes[18];
	memcpy(bytes, playerId.bytes, 16);
	write16(bytes, self.version, 16);
	[self sendMessage:[NSData dataWithBytes:bytes length:18] withType:PLUG_CLIENT_MSG_HELLO];
	
	// Opened!
	self.state = PLUG_STATE_LOBBY;
	[self.delegate plugDidConnect:self];
}

- (void)plugSocket:(PlugSocket *)plugSocket didReceive:(NSData *)data {
	// Append
	[readCache appendData:data];
	
	// Try to extract messages
	UInt8* bytes = (UInt8*)readCache.bytes;
	NSUInteger length = readCache.length;
	while (YES) {
		if (self.state == PLUG_STATE_CLOSED)
			// Ignore everything from here
			break;
		
		if (length < 3)
			// Too little data
			break;
		
		UInt8 B = bytes[0];
		if (B == 0) {
			// Normal message
			if (length < 7)
				break;
			UInt16 messageId = read16(bytes, 1);
			SInt16 type = read16(bytes, 3);
			UInt16 size = read16(bytes, 5);
			
			if (length < 7+size)
				break;
			NSData* message = [NSData dataWithBytes:bytes+7 length:size];
			bytes += 7+size;
			length -= 7+size;
			
			if (messageId == lastSeenId+1)
				// As expected
				[self processMessage:message withType:type];
			else if (messageId > lastSeenId+1)
				// I'm lost
				[self goLost];
		} else if (B == 1) {
			// Resync message
			UInt16 requestId = read16(bytes, 1);
			bytes += 3;
			length -= 3;
			[self processResyncMessage:requestId];
		} else {
			// Error
			[self closeWithError:@"Wrong message class (expected 0 or 1)"];
			return;
		}
	}
}

- (void)plugSocketDidClose:(PlugSocket *)plugSocket {
	// TODO
}

#pragma mark - lost behavior

// Enter the lost state and try to recover
// Can be called at any time (except after close)
- (void)goLost {
	// TODO
}

#pragma mark - message processing

- (void)processMessage:(NSData*)message withType:(SInt16)type {
	if (type == PLUG_SERVER_MSG_MATCHING_UPDATE) {
		[self processMatchingUpdateMessage:message];
	} else if (type == PLUG_SERVER_MSG_GAME_START) {
		[self processGameStartMessage:message];
	} else if (type == PLUG_SERVER_MSG_PLAYER_DISCONNECT) {
		if (self.state != PLUG_STATE_RANDOM_MATCHING) {
			[self closeWithError:@"Unexpected PLUG_SERVER_MSG_PLAYER_DISCONNECT"];
			return;
		}
		// TODO
	} else if (type > 0) {
		if (self.state != PLUG_STATE_RANDOM_MATCHING) {
			[self closeWithError:@"Unexpected custom message"];
			return;
		}
		// TODO
	} else {
		[self closeWithError:@"Unexpected message type"];
		return;
	}
}

- (void)processResyncMessage:(UInt16)requestId {
	// TODO
}

- (void)processMatchingUpdateMessage:(NSData*)message {
	if (self.state != PLUG_STATE_RANDOM_MATCHING) {
		[self closeWithError:@"Unexpected PLUG_SERVER_MSG_MATCHING_UPDATE"];
		return;
	}
	if (message.length != 1) {
		[self closeWithError:@"Wrong message format"];
		return;
	}
	UInt8* bytes = (UInt8*)message.bytes;
	[self.delegate plug:self didReceiveRandomMatchUpdate:bytes[0] goal:matchingPlayersGoal];
}

- (void)processGameStartMessage:(NSData*)message {
	if (self.state != PLUG_STATE_RANDOM_MATCHING) {
		[self closeWithError:@"Unexpected PLUG_SERVER_MSG_GAME_START"];
		return;
	}
	
	NSUInteger pos = 0;
	UInt8* bytes = (UInt8*)message.bytes;
	NSMutableArray* players = [NSMutableArray array];
	for (int i=0; i<matchingPlayersGoal; i++) {
		// Extract info for each player
		if (message.length < pos+17) {
			[self closeWithError:@"Wrong message format"];
			return;
		}
		NSData* pid = [message subdataWithRange:NSMakeRange(pos, 16)];
		UInt8 nameLength = bytes[pos+16];
		NSData* nameBytes = [message subdataWithRange:NSMakeRange(pos+17, nameLength)];
		NSString* pname = [[NSString alloc] initWithData:nameBytes encoding:NSUTF8StringEncoding];
		[players addObject:@{@"name": pname, @"id": pid}];
		pos += 17+nameLength;
	}
	
	self.state = PLUG_STATE_IN_GAME;
	[self.delegate plug:self didStartMatchWithPlayers:players];
}

#pragma mark - communication layer

// Send a message to the socket
// the socket must be open and the message must be up to 16KiB
- (void)sendMessage:(NSData*)message withType:(SInt16)type {
	UInt16 size = (UInt16)message.length;
	
	UInt8 headers[7];
	headers[0] = 0;
	write16(headers, lastSentId, 1);
	write16(headers, type, 3);
	write16(headers, size, 5);
	
	NSMutableData* package = [NSMutableData dataWithCapacity:7+size];
	[package appendBytes:headers length:7];
	[package appendData:message];
	
	lastSentId++;
	[sentMessages addObject:package];
	[socket send:package];
}

// Send a resync request to the server, based on the last seen id
- (void)sendResyncMessage {
	UInt8 bytes[3];
	bytes[0] = 1;
	write16(bytes, lastSeenId, 1);
	
	NSData* package = [NSData dataWithBytes:bytes length:3];
	[socket send:package];
}

@end
