import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {Route,RouterProvider,Routes,createBrowserRouter,createRoutesFromElements} from 'react-router-dom';
import {SocketProvider} from './context/Socket.jsx'
import Room from './pages/Room.jsx'
import NotFound from './pages/NotFound.jsx';

const router = createBrowserRouter(
  createRoutesFromElements(
  <Route path='/'>
    <Route index element={<App/>}/>
      <Route path='/room/:id' element={<Room/>}/>
      <Route path='*' element={<NotFound/>}/>
  </Route>
  )
)

createRoot(document.getElementById('root')).render(
  <SocketProvider>
      <RouterProvider router={router} />
  </SocketProvider>
);
