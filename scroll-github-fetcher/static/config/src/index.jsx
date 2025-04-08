// import React from 'react';
// import ReactDOM from 'react-dom';
// import Config from './Config'; // Don't need the React Config component

import '@atlaskit/css-reset'; // RE-ADDED CSS Reset import

console.log('[Forge Config UI - Plain JS] index.jsx: Bypassing React rendering.');

// Find the root element
const rootElement = document.getElementById('root');

if (rootElement) {
  console.log('[Forge Config UI - Plain JS] index.jsx: Found root element. Inserting plain HTML.');
  // Use plain JavaScript DOM manipulation
  rootElement.innerHTML = '<h2 style="color: purple;">Plain JS Config UI Test</h2><p>If you see this, the config iframe loaded basic JS.</p>';
} else {
  console.error('[Forge Config UI - Plain JS] index.jsx: Could not find root element!');
  document.body.innerHTML = '<h2 style="color: red;">Error: Config root element not found!</h2>';
}

/* Original React rendering code
ReactDOM.render(
  <React.StrictMode>
    <Config />
  </React.StrictMode>,
  document.getElementById('root')
);
*/
