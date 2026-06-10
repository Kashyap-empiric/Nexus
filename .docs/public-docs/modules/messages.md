# Messages Module

## Overview
The Messages module on the backend is responsible for persisting and retrieving individual chat messages.

## Server-Side (`server/src/modules/messages`)
- **Endpoints / Routes**: Provides the `messages.routes.ts` file for handling REST API requests to send a message or fetch historical messages for a conversation.
- **Controllers**: Validates the payload and saves new messages to the database via `messages.controller.ts`.
- **Sockets**: Often emits a socket event when a new message is successfully saved so that connected clients receive it in real-time.
