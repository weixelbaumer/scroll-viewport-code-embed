const express = require('express');
const router = express.Router();
const cors = require('cors');
const { fetchGitHubCode } = require('../utils/githubService');
const { logger } = require('../utils/logger');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'GitHub Code Renderer for Confluence' });
});

/* GET documentation page */
router.get('/documentation.html', function(req, res) {
  res.sendFile('documentation.html', { root: 'public' });
});

/* POST route for GitHub code fetching - Called by the Confluence macro */
router.post('/github-code', cors(), async function(req, res) {
  const { url, lineRange, theme = 'github-light' } = req.body;
  
  logger.info('Received GitHub code request:', { url, lineRange, theme });
  
  if (!url) {
    return res.status(400).json({
      error: 'Missing GitHub URL',
      details: 'The GitHub URL is required to fetch code.'
    });
  }
  
  try {
    const code = await fetchGitHubCode(url, lineRange);
    
    // Calculate height based on number of lines
    const lines = code.split('\n').length;
    const lineHeight = 21; // approximate line height in pixels
    const height = Math.min(500, lines * lineHeight + 40); // cap at 500px, add some padding
    
    res.json({
      code,
      height,
      width: '100%',
      theme
    });
  } catch (error) {
    logger.error('Error fetching GitHub code:', error);
    res.status(500).json({
      error: 'Failed to fetch GitHub code',
      details: error.message
    });
  }
});

/* GET route for GitHub code fetching - Called by direct script embeds */
router.get('/github-code', cors(), async function(req, res) {
  const { url, lineRange, theme = 'github-light' } = req.query;
  
  logger.info('Received GitHub code request (GET):', { url, lineRange, theme });
  
  if (!url) {
    return res.status(400).json({
      error: 'Missing GitHub URL',
      details: 'The GitHub URL is required to fetch code.'
    });
  }
  
  try {
    const code = await fetchGitHubCode(url, lineRange);
    
    // Calculate height based on number of lines
    const lines = code.split('\n').length;
    const lineHeight = 21; // approximate line height in pixels
    const height = Math.min(500, lines * lineHeight + 40); // cap at 500px, add some padding
    
    res.json({
      code,
      height,
      width: '100%',
      theme
    });
  } catch (error) {
    logger.error('Error fetching GitHub code:', error);
    res.status(500).json({
      error: 'Failed to fetch GitHub code',
      details: error.message
    });
  }
});

module.exports = router; 