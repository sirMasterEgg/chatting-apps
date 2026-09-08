import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/room/:roomId', element: <RoomPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
