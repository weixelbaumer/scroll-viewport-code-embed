import React from 'react';
import { createRoot } from 'react-dom/client'; // React 18 syntax
import Config from './Config';
import '@atlaskit/css-reset';

console.log('[Forge Config UI - React 18] Initializing React config app...');

// React 18 way to render
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Config />
  </React.StrictMode>
);
