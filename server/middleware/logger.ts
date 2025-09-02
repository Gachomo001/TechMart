import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logStream = fs.createWriteStream(
  path.join(logsDir, 'server.log'), 
  { flags: 'a' }
);

function logRequest(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = `req_${Date.now()}`;
  
  // Log request details
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    cookies: req.cookies,
    ip: req.ip,
  };

  // Log to file
  logStream.write(JSON.stringify(logEntry, null, 2) + '\n');
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${requestId}] ${req.method} ${req.originalUrl}`);
    if (Object.keys(req.body).length > 0) {
      console.log(`[${requestId}] Request body:`, req.body);
    }
  }

  // Store the request ID for response logging
  res.locals.requestId = requestId;
  res.locals.startTime = start;

  // Log response when it's finished
  const originalEnd = res.end;
  res.end = function(chunk?: any, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void): Response {
    const responseTime = Date.now() - res.locals.startTime;
    
    const responseLog = {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseTime: `${responseTime}ms`,
      headers: res.getHeaders(),
      ...(chunk && {
        body: chunk.toString()
      })
    };

    // Log to file
    logStream.write(JSON.stringify(responseLog, null, 2) + '\n');
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${res.locals.requestId}] ${res.statusCode} ${res.statusMessage} (${responseTime}ms)`);
      if (chunk) {
        try {
          const responseBody = JSON.parse(chunk.toString());
          if (responseBody.error) {
            console.error(`[${res.locals.requestId}] Error:`, responseBody);
          }
        } catch (e) {
          // Not JSON, log as is
          console.log(`[${res.locals.requestId}] Response:`, chunk.toString());
        }
      }
    }

    // Call the original end function with the correct arguments
    const args: any[] = [];
    if (chunk !== undefined) args.push(chunk);
    if (typeof encodingOrCallback === 'string' || typeof encodingOrCallback === 'function') {
      args.push(encodingOrCallback);
    }
    if (callback) {
      args.push(callback);
    }
    return (originalEnd as any).apply(this, args);
  };

  next();
}

// Error logging middleware
function logError(err: Error, req: Request, res: Response, next: NextFunction) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || `err_${Date.now()}`,
    error: {
      stack: err.stack,
      ...err
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params
    }
  };

  // Log to file
  logStream.write(JSON.stringify(errorLog, null, 2) + '\n');
  
  // Log to console
  console.error(`[${errorLog.requestId}] ERROR:`, errorLog.error);
  
  next(err);
}

export { logRequest, logError };
