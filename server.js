// This is a simple wrapper to run the server with the correct configuration
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Raw body capture for IntaSend webhook HMAC verification
app.use('/api/payment/card/webhook', express.json({
  verify: (req, res, buf) => {
    try {
      req.rawBody = buf.toString('utf8');
    } catch (e) {
      req.rawBody = undefined;
    }
  }
}));

// Standard JSON parser for the rest of the app
app.use(express.json());

const serverProcess = spawn('node', [
  '--loader', 'ts-node/esm',
  '--no-warnings',
  `${__dirname}/server/index.ts`
], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: '--loader ts-node/esm --no-warnings',
    NODE_NO_WARNINGS: '1'
  }
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
});
