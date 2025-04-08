// Remove React imports
// import React from 'react';
// import ReactDOM from 'react-dom';
// import App from './App'; // Don't need the React App component

import '@atlaskit/css-reset'; // RE-ADDED CSS Reset import

// Import the plain JavaScript initialization function
import initializeApp from './plain-app.js';

console.log('[Forge Custom UI - Plain JS] index.jsx: Initializing plain JS app.');

// Call the initialization function
initializeApp();

// Remove React rendering code
/*
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
*/
