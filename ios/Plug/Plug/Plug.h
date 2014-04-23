//
//  Plug.h
//  Plug
//
//  Created by Guilherme Souza on 4/23/14.
//  Copyright (c) 2014 Sitegui. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "PlugDelegate.h"

typedef enum : NSUInteger {
    PLUG_STATE_CONNECTING, // the initial state, after init
    PLUG_STATE_LOBBY, // when the connection is done
    PLUG_STATE_RANDOM_MATCHING, // while waiting for other players
	PLUG_STATE_IN_GAME, // after the match has been completed
	PLUG_STATE_CLOSING, // after a call to close
	PLUG_STATE_CLOSED // final state, nothing more can happen
} PlugState;

@interface Plug : NSObject

// Current connection state
@property (nonatomic, readonly) PlugState state;

// After the connection is lost, how many times to try to recover it
// before assuming to be disconnected for ever
@property (nonatomic) NSUInteger maxReconnectAttempts;

@property (nonatomic, weak) id<PlugDelegate> delegate;

// Start the plug with a connection to the given server address and port
// The server will only match players with the same version
// new state: PLUG_STATE_CONNECTING
- (instancetype)initWithHost:(NSString*)host port:(UInt32)port andAppVersion:(NSUInteger)version;

// Start a random match with the given number of players
// PLUG_STATE_LOBBY -> PLUG_STATE_RANDOM_MATCHING
- (void)startRandomMatchWithName:(NSString*)name andPlayers:(NSUInteger)players;

// Stop the current matching process
// PLUG_STATE_RANDOM_MATCHING -> PLUG_STATE_LOBBY
- (void)cancelMatching;

// Send a message, while in game, to the others
// message is any object that can be parsed by NSJSONSerialization
// type is a custom value, defined by the application
- (void)sendGameMessage:(id)message withType:(UInt16)type;

// Start the closing process
// x -> PLUG_STATE_CLOSING
- (void)close;

@end
