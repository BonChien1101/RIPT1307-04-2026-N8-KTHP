import React from 'react';
import ReactDOM from 'react-dom';
import RootApp from './RootApp';

(globalThis as any).React = React;

ReactDOM.render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
,
  document.getElementById('root')
);