import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3000';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);