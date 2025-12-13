// Import the WebSocket library
const WebSocket = require('ws');

// Create a new WebSocket server
const wss = new WebSocket.Server({ port: 9001 });

// Handle new connections
wss.on('connection', (ws) => {
  console.log('New client connected.');

  // Handle incoming messages from clients (browser tabs)
  ws.on('message', (message) => {
    // Try to parse as JSON string first
    try {
      const str = message.toString('utf8');
      const parsed = JSON.parse(str);
  
      console.log('Received JSON message:', parsed);
  
      // Broadcast to other clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsed));
        }
      });
  
    } catch (err) {
      // If not JSON, then treat it as binary (assume it's a VTK file)
      console.log('Received binary VTK file:', message);
  
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });
    // if (Buffer.isBuffer(message)) {
    //   console.log('Received a binary file (VTK file):', message);
      
    //   // Broadcast the binary data to all connected clients (except the sender)
    //   wss.clients.forEach(client => {
    //     if (client !== ws && client.readyState === WebSocket.OPEN) {
    //       client.send(message);  // Send binary data to other clients
    //     }
    //   });
    // }
    // else{
    //   try {
    //   console.log('Received non-binary message:', message);
    //   const parsedMessage = JSON.parse(message); // Parse the message

    //   // Broadcast the received message to all clients (except sender)
    //   wss.clients.forEach((client) => {
    //     if (client !== ws && client.readyState === WebSocket.OPEN) {
    //       client.send(JSON.stringify(parsedMessage));  // Send the message to other clients
    //     }
    //   });
    //   } catch (e) {
    //     console.error('Error parsing message:', e);
    //   }
    // }

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Print a message when the server starts
console.log('WebSocket server running at ws://localhost:9001');
