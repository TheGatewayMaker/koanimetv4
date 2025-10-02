/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface AuthUser {
  id: string;
  username: string;
  createdAt: number;
}
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface WatchEntry {
  animeId: number;
  episode: number;
  position: number; // seconds
  title?: string;
  image?: string;
  updatedAt: number;
}

export interface ContinueWatchingResponse {
  history: WatchEntry[];
}
