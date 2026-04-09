# ZenTalk Project Guidelines

## Code Style
- **TypeScript**: Strict mode enabled - run `npm run type-check` before commits
- **ESLint**: Enforces React hooks rules, no unused vars (except prefixed with `_`), no falsy defaults
- **Prettier**: Format with `npm run format` - single quotes, semicolons, trailing commas
- **Naming**: PascalCase for components/types, camelCase for utilities/hooks
- **Imports**: Use path aliases (`@/` for `src/`, `@/api/*` for `src/server/api/*`)

## Architecture
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + Socket.io + MongoDB + WebRTC signaling
- **Layout System**: RootLayout wraps entire app once in router (App.tsx) - see [src/layouts/RootLayout.md](src/layouts/RootLayout.md)
- **State Management**: 
  - Zustand + localStorage for persistent data (users, chats)
  - React Context for real-time state (Socket.io, auth, calls)
  - Component state for UI-only concerns

## Build and Test
- **Dev**: `npm run dev` (frontend on 5173), `npm run signaling` (backend on 3001) - run both
- **Build**: `npm run build` for production
- **Test**: `npm run test` (Vitest), `npm run test:coverage`
- **Lint**: `npm run lint`, `npm run lint:fix`
- **Type Check**: `npm run type-check`

## Conventions
- **Routing**: React Router v7 with lazy loading - RootLayout applied in router, not per-page
- **API Client**: Smart URL resolution with fallbacks - see [src/lib/api-client.ts](src/lib/api-client.ts)
- **Forms**: react-hook-form + Zod validation
- **WebRTC**: Basic setup with Google STUN servers for audio/video calls
- **Real-time**: Socket.io for messaging, presence, call signaling
- **Database**: MongoDB with Mongoose - models in [src/server/models.js](src/server/models.js)

See [README.md](README.md) for full tech stack and [env.example](env.example) for configuration.