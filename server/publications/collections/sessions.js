import { Mongo } from "meteor/mongo";
import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { Reaction } from "/server/api";

/**
 * @name ServerSessions
 * @memberof Collections/ServerOnly
 * @type {MongoCollection}
 */
export const ServerSessions = new Mongo.Collection("Sessions");

// Reaction Server / amplify permanent sessions
Meteor.publish("Sessions", (sessionId) => {
  check(sessionId, Match.OneOf(String, null));
  const created = new Date().getTime();
  let newSessionId;
  // if we don"t have a sessionId create a new session
  // REALLY - we should always have a client sessionId
  if (!sessionId) {
    newSessionId = ServerSessions.insert({ created });
  } else {
    newSessionId = sessionId;
  }
  // get the session from existing sessionId
  const serverSession = ServerSessions.find(newSessionId);

  // if not found, also create a new server session
  if (serverSession.count() === 0) {
    ServerSessions.insert({ _id: newSessionId, created });
  }

  // set global sessionId
  Reaction.sessionId = newSessionId;

  // return cursor
  return ServerSessions.find(newSessionId);
});