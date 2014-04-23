//
//  Plug.m
//  Plug
//
//  Created by Guilherme Souza on 4/23/14.
//  Copyright (c) 2014 Sitegui. All rights reserved.
//

#import "Plug.h"
#import "PlugSocket.h"

@interface Plug()<PlugSocketDelegate> {
	PlugSocket* socket;
}

@property (nonatomic, readwrite) PlugState state;


@end

@implementation Plug

- (instancetype)initWithHost:(NSString *)host port:(UInt32)port andAppVersion:(NSUInteger)version {
	if (self = [super init]) {
		socket = [[PlugSocket alloc] initWithHost:host andPort:port];
		socket.delegate = self;
	}
	return self;
}

- (void)startRandomMatchWithName:(NSString *)name andPlayers:(NSUInteger)players {
	// TODO
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

#pragma mark - plug socket delegate

- (void)plugSocketDidOpen:(PlugSocket *)plugSocket {
	// Send hello message
}

- (void)plugSocket:(PlugSocket *)plugSocket didReceive:(NSData *)data {
	
}

- (void)plugSocketDidClose:(PlugSocket *)plugSocket {
	
}

#pragma mark - player id

// Return 16 random bytes
- (NSData*)generatePlayerId {
	UInt8 bytes[16];
	arc4random_buf(bytes, 16);
	return [NSData dataWithBytes:bytes length:16];
}

// Convert a 16-byte NSData to a NSString
- (NSString*)convertPlayerIdToString:(NSData*)playerId {
	NSUInteger len = playerId.length;
	UInt8 hexBytes[len*2];
	UInt8* bytes = (UInt8*)playerId.bytes;
	
	for (int i=0; i<len; i++) {
		UInt8 byte = bytes[i];
		
		UInt8 h = byte>>4;
		UInt8 l = byte&0xF;
		
		hexBytes[2*i] = h < 10 ? '0'+h : 'A'+(h-10);
		hexBytes[2*i+1] = l < 10 ? '0'+l : 'A'+(l-10);
	}
	
	return [[NSString alloc] initWithBytes:hexBytes length:2*len encoding:NSASCIIStringEncoding];
}

@end
