
const express = require('express');
const app = express();

// Enable detailed logging
app.use((req, res, next) => {
  console.log(`[SERVER] ${req.method} ${req.path}`);
  console.log('[SERVER] Request body:', req.body);
  next();
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Test server running on port 5000');
});
