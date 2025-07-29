import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import { useConfig } from '@forge/react';

const useSubmit = () => {
  const [error, setError] = useState();
  const [message, setMessage] = useState('');

  const submit = async (fields) => {
    const payload = { config: fields };

    try {
      await view.submit(payload);
      setError(false);
      setMessage(`Submitted successfully.`);
    } catch (error) {
      setError(true);
      setMessage(`${error.code}: ${error.message}`);
    }
  };

  return {
    error,
    message,
    submit
  };
};

const Config = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [lineRange, setLineRange] = useState('');
  const [theme, setTheme] = useState('github-light');
  const { error, message, submit } = useSubmit();
  const config = useConfig();

  useEffect(() => {
    setGithubUrl(config?.githubUrl || '');
    setLineRange(config?.lineRange || '');
    setTheme(config?.theme || 'github-light');
  }, [config]);

  const handleSubmit = () => {
    submit({ 
      githubUrl, 
      lineRange, 
      theme 
    });
  };

  return (
    <div style={{ padding: '16px', fontFamily: 'Arial, sans-serif' }}>
      <h3>GitHub Code Block Configuration</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="githubUrl" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          GitHub URL *
        </label>
        <input 
          type="text" 
          id="githubUrl" 
          value={githubUrl} 
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/user/repo/blob/main/file.js"
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <small style={{ color: '#666' }}>Full URL to the file on GitHub</small>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="lineRange" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Line Range (Optional)
        </label>
        <input 
          type="text" 
          id="lineRange" 
          value={lineRange} 
          onChange={(e) => setLineRange(e.target.value)}
          placeholder="10-20, 25, 30-35"
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <small style={{ color: '#666' }}>Specific lines (e.g., "10-20" or "15,25,30")</small>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="theme" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Theme
        </label>
        <select 
          id="theme" 
          value={theme} 
          onChange={(e) => setTheme(e.target.value)}
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="github-light">GitHub Light</option>
          <option value="github-dark">GitHub Dark</option>
          <option value="monokai">Monokai</option>
          <option value="dracula">Dracula</option>
          <option value="vs2015">VS 2015</option>
          <option value="xcode">Xcode</option>
          <option value="atom-one-dark">Atom One Dark</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => view.close()}
          style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', background: '#f5f5f5' }}
        >
          Cancel
        </button>
        <button 
          onClick={handleSubmit}
          disabled={!githubUrl.trim()}
          style={{ 
            padding: '8px 16px', 
            border: 'none', 
            borderRadius: '4px', 
            background: githubUrl.trim() ? '#0052cc' : '#ccc', 
            color: 'white',
            cursor: githubUrl.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          Save Configuration
        </button>
      </div>
      
      {typeof error !== 'undefined' && (
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          borderRadius: '4px',
          background: error ? '#ffebee' : '#e8f5e8',
          color: error ? '#c62828' : '#2e7d32'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default Config;
