import React from 'react';
import ReactDOM from 'react-dom';
import App from './App'; // Assuming App.jsx contains the minimal static component now

import '@atlaskit/css-reset';

console.log('[Forge Custom UI] index.jsx: Reverting to React rendering.');

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
