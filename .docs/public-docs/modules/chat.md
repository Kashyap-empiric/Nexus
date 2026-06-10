# Chat Module

## Overview
The Chat module provides the core realtime messaging UI on the frontend.

## Client-Side (`client/src/modules/chat`)
- **Realtime Integration**: Hooks into Socket.io to listen for incoming messages and dispatch sent messages.
- **State Management**: Uses hooks (e.g., `useMessages.ts`) to maintain the local array of messages for the active conversation.
- **UI Components**: Contains the message list, message bubbles, text input area, and typing indicators.
- **Performance**: Parses message arrays chronologically and utilizes browser native scroll behaviors (e.g., `scrollIntoView`) rather than CSS flex-reversals to maintain a native-feeling chat experience.
