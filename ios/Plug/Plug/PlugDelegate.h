//
//  PlugDelegate.h
//  Plug
//
//  Created by Guilherme Souza on 4/23/14.
//  Copyright (c) 2014 Sitegui. All rights reserved.
//

#import <Foundation/Foundation.h>
@class Plug;

@protocol PlugDelegate <NSObject>

// Called after the connection is first established
// PLUG_STATE_CONNECTING -> PLUG_STATE_LOBBY
- (void)plugDidConnect:(Plug*)plug;

// Update info while in PLUG_STATE_RANDOM_MATCHING
// goal is the target number of players
- (void)plug:(Plug*)plug didReceiveRandomMatchUpdate:(UInt8)playersInRoom goal:(UInt8)goal;

// The matching is done and the game is starting
// Each element of players is a dictionary with keys "name" (NSString*) and "id" (NSData*)
// The player order is the same for everybody in the room
// PLUG_STATE_RANDOM_MATCHING -> PLUG_STATE_IN_GAME
- (void)plug:(Plug*)plug didStartMatchWithPlayers:(NSArray*)players;

// Another player sent a game message
// Only happens while PLUG_STATE_IN_GAME
- (void)plug:(Plug*)plug didReceiveGameMessage:(id)message withType:(UInt16)type fromPlayer:(NSString*)playerId;

// Inform that a player has disconnected from the game
// clean indicates whether the player disconnected intentionally or not
// Only happens while PLUG_STATE_IN_GAME
- (void)plug:(Plug*)plug player:(NSString*)playerId didDisconnectClean:(BOOL)clean;

// The connection is now closed and nothing more can happen
// x -> PLUG_STATE_CLOSED
- (void)plug:(Plug*)plug didDisconnectClean:(BOOL)clean;

// The connection lost its synchronization with the server
// This means that the game should be completely reseted
// All messages will be received again with plug:didReceiveGameMessage:withType:fromPlayer:
// Only happens while PLUG_STATE_IN_GAME
- (void)plugDidLoseSynchronization:(Plug*)plug;

// The connection is synchronized again
// Happens after plugDidLoseSynchronization:
// Only happens while PLUG_STATE_IN_GAME
- (void)plugDidRecoverSynchronization:(Plug*)plug;

@optional

// Called when the connection is lost
// The plug will try to reconnect maxReconnectAttempts
// If all attempts fail, plug:didDisconnectClean: will be called
- (void)plugDidLoseConnection:(Plug*)plug;

// Called when the connection is up again
- (void)plugDidRecoverConnection:(Plug*)plug;

@end
