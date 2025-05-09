/**
 * Simplified authentication system for the TCOF application
 */
import { Request, Response, NextFunction } from 'express';
import { Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { query } from './direct-db'; // Using direct-db for query
import PgStore from 'connect-pg-simple';
import crypto from 'crypto';

// Helper function to hash passwords - uses simple SHA-256 hash for consistency
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Simplified middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

export function setupAuth(app: Express) {
  // Configure session middleware
  app.use(
    session({
      store: new (PgStore(session))({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        tableName: 'sessions'
      }),
      secret: process.env.SESSION_SECRET || 'tcof-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      }
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure simplified local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      console.log(`Authenticating user: ${username}`);
      
      // Generate hash for the provided password
      const passwordHash = hashPassword(password);
      console.log(`Generated hash for comparison: ${passwordHash.substring(0, 10)}...`);
      
      // Get user from database
      const users = await query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
      
      if (!users || users.length === 0) {
        console.log(`No user found with username/email: ${username}`);
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      const user = users[0];
      console.log(`Found user with ID: ${user.id}, username: ${user.username}`);
      
      // Check if password matches the stored hash directly
      if (user.password === passwordHash) {
        console.log('Password matched with exact hash comparison');
        return done(null, user);
      }
      
      console.log('Password did not match any known format, authentication failed');
      return done(null, false, { message: 'Invalid username or password' });
    } catch (error) {
      console.error('Authentication error:', error);
      return done(error);
    }
  }));

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    console.log(`Serializing user with ID: ${user.id}`);
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number | string, done) => {
    try {
      console.log(`Deserializing user with ID: ${id}`);
      const users = await query('SELECT * FROM users WHERE id = $1', [id]);
      
      if (!users || users.length === 0) {
        console.log(`No user found with ID: ${id} during deserialization`);
        return done(null, false);
      }
      
      const user = users[0];
      console.log(`Successfully deserialized user: ${user.username}`);
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Login route
  app.post('/api/login', (req, res, next) => {
    console.log('Login request received:', { 
      username: req.body.username,
      hasPassword: !!req.body.password 
    });
    
    if (!req.body.username || !req.body.password) {
      console.log('Missing username or password');
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      
      if (!user) {
        console.log('Authentication failed:', info?.message);
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      console.log(`User authenticated: ${user.username}, creating session`);
      req.login(user, (err) => {
        if (err) {
          console.error('Session error:', err);
          return res.status(500).json({ message: 'Failed to create session' });
        }
        
        // Remove password from response
        const { password, ...safeUser } = user;
        console.log(`Session created for user: ${user.username}`);
        return res.status(200).json(safeUser);
      });
    })(req, res, next);
  });

  // Logout route
  app.post('/api/logout', (req, res) => {
    if (req.isAuthenticated()) {
      console.log(`Logging out user: ${(req.user as any).username}`);
    }
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Error during logout' });
      }
      
      console.log('User successfully logged out');
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });

  // Get current user route
  app.get('/api/auth/user', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Remove password from response
    const { password, ...safeUser } = req.user as any;
    console.log(`Current user: ${safeUser.username}`);
    res.status(200).json(safeUser);
  });

  // Registration route
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      console.log(`Registration request for username: ${username}`);
      
      // Check if username already exists
      const existingUsers = await query('SELECT * FROM users WHERE username = $1', [username]);
      
      if (existingUsers && existingUsers.length > 0) {
        console.log(`Username already taken: ${username}`);
        return res.status(409).json({ message: 'Username already taken' });
      }
      
      // Hash password with simple SHA-256
      const passwordHash = hashPassword(password);
      
      // Insert new user
      const result = await query(
        'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [username, email || null, passwordHash, new Date()]
      );
      
      if (!result || result.length === 0) {
        throw new Error('Failed to create user');
      }
      
      const newUser = result[0];
      console.log(`User created with ID: ${newUser.id}`);
      
      // Log user in
      req.login(newUser, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ message: 'Error logging in after registration' });
        }
        
        // Remove password from response
        const { password, ...safeUser } = newUser;
        console.log(`New user logged in: ${safeUser.username}`);
        res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}