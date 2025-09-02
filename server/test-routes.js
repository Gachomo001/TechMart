import express from 'express';
const app = express();

// Test basic route
app.get('/test', (req, res) => {
  res.json({ success: true });
});

// Test route with parameters
app.get('/test/:id', (req, res) => {
  res.json({ id: req.params.id });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Try these endpoints:');
  console.log(`- http://localhost:${PORT}/test`);
  console.log(`- http://localhost:${PORT}/test/123`);
});
