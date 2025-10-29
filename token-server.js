const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/token', async (req, res) => {
  try {
    const { roomName, userName } = req.body;
    
    console.log(`🎫 Generating token for ${userName} in room ${roomName}`);
    
    // Try to import AccessToken
    let AccessToken;
    try {
      const sdk = require('livekit-server-sdk');
      console.log('   SDK loaded:', Object.keys(sdk));
      AccessToken = sdk.AccessToken;
      
      if (!AccessToken) {
        throw new Error('AccessToken not found in livekit-server-sdk');
      }
    } catch (importError) {
      console.error('❌ Failed to import livekit-server-sdk:', importError.message);
      return res.status(500).json({ 
        error: 'Failed to load SDK',
        details: importError.message 
      });
    }
    
    // Create access token
    const at = new AccessToken('devkey', 'secret', {
      identity: userName,
    });
    
    console.log('   AccessToken created');
    
    // Add grants
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    
    console.log('   Grants added');

    // Generate JWT token
    const token = await at.toJwt();
    
    console.log('   Token type:', typeof token);
    console.log('   Token value:', token ? token.substring(0, 50) + '...' : 'null/undefined');
    
    // Verify token was generated
    if (!token || typeof token !== 'string') {
      console.error('❌ Token generation returned invalid value:', token);
      return res.status(500).json({ error: 'Token generation failed - invalid token' });
    }
    
    console.log('✅ Token generated successfully');
    
    // Return token as string
    res.json({ token: token });
    
  } catch (error) {
    console.error('❌ Error generating token:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Token server running' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Token server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  
  // Test SDK loading on startup
  try {
    const sdk = require('livekit-server-sdk');
    console.log('   ✅ livekit-server-sdk loaded successfully');
    console.log('   Available exports:', Object.keys(sdk).join(', '));
  } catch (error) {
    console.error('   ❌ Failed to load livekit-server-sdk:', error.message);
    console.error('   Run: npm install livekit-server-sdk');
  }
});