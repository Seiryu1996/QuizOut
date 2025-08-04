# QuizOut - Project Overview

## Purpose
A real-time quiz application designed for group company year-end parties, supporting 200 simultaneous participants. Features sudden-death quiz progression with revival rounds, real-time WebSocket communication, and an admin dashboard.

## Tech Stack

### Backend
- **Language**: Go 1.23
- **Framework**: Gin (web framework)
- **WebSocket**: Gorilla WebSocket
- **Database**: Firebase Firestore
- **AI APIs**: Gemini, OpenAI, Claude (with fallback)
- **Authentication**: Firebase Auth
- **Testing**: Go built-in testing + Testify

### Frontend  
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **WebSocket**: Socket.io-client
- **Testing**: Jest + React Testing Library
- **Authentication**: Firebase Client SDK

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Deployment**: GCP Cloud Run
- **Development**: Firebase Emulators for local development