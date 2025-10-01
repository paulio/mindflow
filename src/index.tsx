import './lib/passive-events-patch';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './pages/App';

const container = document.getElementById('root');
if (!container) throw new Error('Root container missing');
const root = createRoot(container);
root.render(<App />);
