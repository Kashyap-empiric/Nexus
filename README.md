# Nexus

## How to Start a Conversation

To test the application or start a new chat:
1. Locate the **Direct Messages** section in the left sidebar.
2. Click the **`+`** (plus) icon next to the section title.
3. A modal will appear instantly displaying a **Suggested Users** list containing existing registered accounts.
4. Click on any user from this list to automatically create a direct message channel and begin chatting.

---

Nexus is a real-time messaging application structured around a client-server architecture. The project facilitates direct communication between users with features including real-time text exchange, presence tracking, and read receipts.

## Architecture

The system is divided into two primary components: a frontend client and a backend server.

### Client
The frontend is developed using Next.js and React. It relies on TanStack Query for data fetching, caching, and optimistic UI updates. State synchronization for real-time events is managed through a Socket.io client connection. The user interface is built with Tailwind CSS and standard React components. Authentication is handled via Supabase.

### Server
The backend is a Node.js application utilizing the Express framework. It exposes a REST API for standard HTTP requests and maintains a Socket.io server for bidirectional communication. Data persistence is managed through PostgreSQL using Prisma as the Object-Relational Mapper (ORM).

## Core Features

- **Real-time Messaging:** Messages are transmitted and received over WebSockets, minimizing latency.
- **Direct Messages:** Users can initiate one-on-one conversations.
- **User Discovery:** New users are automatically presented with a suggested list of active members to facilitate immediate connection.
- **Presence Indicators:** The system tracks and displays active socket connections to denote user online status.
- **Read Receipts:** Unread message states are calculated based on the latest message ID and the user's cursor position.
- **Rate Limiting:** Socket middleware restricts the volume of message events to prevent system abuse.
- **State Synchronization:** The client maintains a global socket listener to update unread badges and conversation sorting irrespective of the current active view.

## Development Setup

Both the client and server require independent configuration.

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL database
- Supabase account for authentication services

### Environment Configuration
The system requires specific environment variables for database connections, authentication keys, and API routing. These must be defined in the respective `.env` files for both the client and the server.

### Running Locally
To run the application in a development environment, initiate the development servers for both components:

1. Start the backend process:
   `cd server && npm run dev`
2. Start the frontend process:
   `cd client && npm run dev`

## Deployment

The repository includes a `render.yaml` blueprint for infrastructure provisioning on Render. The configuration defines the necessary web services, build scripts, and runtime environments for both the client and server.
