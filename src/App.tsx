import React from 'react';
import { LightningScene } from './components/LightningScene';

export function App() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <h1
        style={{
          color: '#fff',
          fontSize: '1.5rem',
          fontFamily: 'monospace',
          marginBottom: '0.5rem',
          position: 'absolute',
          top: '20px',
          zIndex: 10,
        }}
      >
        ⚡ Lightning VJ
      </h1>
      <div style={{ width: '100%', height: '100%' }}>
        <LightningScene />
      </div>
    </div>
  );
}

export default App;
