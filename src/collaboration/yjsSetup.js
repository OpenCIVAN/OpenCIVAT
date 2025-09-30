//Yjs setup
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { NETWORK_CONFIG } from "../config/constants";

// ----------------------------------------------------------------------------
//  Set up Yjs doc + provider
// ----------------------------------------------------------------------------

export const ydoc = new Y.Doc();

export const provider = new WebsocketProvider(
  NETWORK_CONFIG.WEBSOCKET_URL,
  NETWORK_CONFIG.ROOM_NAME,
  ydoc
);

// Shared state maps
export const yActor = ydoc.getMap("actor");
export const yFile = ydoc.getMap("fileData");
export const yReduction = ydoc.getMap("reduction");
export const yCursors = ydoc.getMap("cursors");
export const yUserNames = ydoc.getMap("userNames");

// Future VR collaboration maps
export const yAvatars = ydoc.getMap("avatars");
export const yVRControllers = ydoc.getMap("vrControllers");
