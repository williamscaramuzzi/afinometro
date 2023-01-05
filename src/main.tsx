import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createHashRouter,
  RouterProvider,
} from "react-router-dom";
import Afinador from './routes/Afinador';
import Metronomo from './routes/Metronomo';

const router = createHashRouter([
  {
    path: "/",
    element: <Metronomo/>
  },
  {
    path: "/afinador",
    element: <Afinador/>
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
