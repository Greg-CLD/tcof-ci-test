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

// Import the storage interface from storage.ts
import { storage } from './storage';

// Helper function to hash passwords - uses simple SHA-256 hash for consistency
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper function to compare scrypt-based passwords
async function comparePasswords(supplied: string, stored: string) {
  try {
    // Import from storage.ts
    return await storage.comparePasswords(supplied, stored);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
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
      
      // Generate hash for the provided password for simple comparison
      const passwordHash = hashPassword(password);
      console.log(`Generated hash for comparison: ${passwordHash.substring(0, 10)}...`);
      
      // Try to find user with direct username match first
      let user = await storage.getUserByUsername(username);
      
      // If not found by username, try with email
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      
      // If still not found, try with direct query as a fallback
      if (!user) {
        console.log('User not found in storage, trying direct query...');
        const users = await query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
        if (users && users.length > 0) {
          user = users[0];
        }
      }
      
      if (!user) {
        console.log(`No user found with username/email: ${username}`);
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      console.log(`Found user with ID: ${user.id}, username: ${user.username}`);
      
      // First try exact hash match for simple passwords
      if (user.password === passwordHash) {
        console.log('Password matched with exact hash comparison');
        return done(null, user);
      }
      
      // Then try the scrypt format if the password has a dot in it (indicating salt)
      if (user.password && user.password.includes('.')) {
        try {
          const isValid = await comparePasswords(password, user.password);
          if (isValid) {
            console.log('Password matched with scrypt comparison');
            return done(null, user);
          }
        } catch (err) {
          console.error('Error comparing passwords with scrypt:', err);
        }
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
      
      // First try using storage getUser method
      let user = await storage.getUser(id);
      
      // If storage method failed, fallback to direct query
      if (!user) {
        console.log('User not found via storage, trying direct query...');
        const users = await query('SELECT * FROM users WHERE id = $1', [id]);
        
        if (users && users.length > 0) {
          user = users[0];
        }
      }
      
      if (!user) {
        console.log(`No user found with ID: ${id} during deserialization`);
        return done(null, false);
      }
      
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
  
  // Session refresh endpoint
  app.post('/api/auth/refresh-session', async (req, res) => {
    console.log('Session refresh requested');
    
    // Log current session state
    console.log('Session debug:', {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      passport: req.session?.passport,
      cookie: req.session?.cookie
    });

    // If already authenticated, update the session and return success
    if (req.isAuthenticated()) {
      console.log('Session already authenticated, updating expiry');
      
      // Touch the session to update its expiry
      if (req.session) {
        req.session.touch();
      }
      
      // Remove password from response
      const { password, ...safeUser } = req.user as any;
      
      res.status(200).json({ 
        success: true, 
        message: 'Session refreshed successfully',
        user: safeUser 
      });
      return;
    }
    
    // SESSION RECOVERY: If we have a session but missing passport data
    // This is the critical fix for the task persistence issue
    if (req.session && req.sessionID) {
      try {
        // First, check if this user has an active session in the database
        console.log('Attempting session recovery with sessionID:', req.sessionID);
        
        // Try first with the same database table as the express-session store
        let sessionResult;
        try {
          // Using direct DB query to check for active sessions
          sessionResult = await query(
            'SELECT * FROM sessions WHERE sid = $1',
            [req.sessionID]
          );
        } catch (err) {
          console.error('Error querying sessions table:', err);
          // Try with session table (alternative name used in some backups)
          try {
            sessionResult = await query(
              'SELECT * FROM session WHERE sid = $1',
              [req.sessionID]
            );
          } catch (backupErr) {
            console.error('Error querying session table:', backupErr);
          }
        }
        
        if (sessionResult && sessionResult.length > 0) {
          // We found a session record, try to extract user ID from sess JSON
          const sessionData = sessionResult[0];
          let sessObj;
          
          try {
            sessObj = typeof sessionData.sess === 'string' 
              ? JSON.parse(sessionData.sess) 
              : sessionData.sess;
            
            console.log('Found session data:', {
              sid: sessionData.sid,
              hasPassport: !!sessObj.passport,
              passportUserId: sessObj.passport?.user
            });
          } catch (parseErr) {
            console.error('[AUTH_ERROR] Error parsing session data:', parseErr);
            return res.status(401).json({
              success: false,
              error: 'AUTH_EXPIRED',
              message: 'Session refresh failed'
            });
          }
          
          // If we have a user ID in the session, try to restore the user
          if (sessObj?.passport?.user) {
            const userId = sessObj.passport.user;
            console.log(`Attempting to restore user with ID: ${userId}`);
            
            try {
              // Find user by ID
              const user = await storage.getUser(userId);
              
              if (user) {
                console.log(`Successfully found user ${user.username}, restoring session`);
                
                // Manually restore the session passport data
                if (!req.session.passport) {
                  req.session.passport = { user: userId };
                  
                  try {
                    await new Promise<void>((resolve, reject) => {
                      req.session.save((err) => {
                        if (err) {
                          console.error('Error saving session:', err);
                          reject(err);
                        } else {
                          console.log('Session passport data restored');
                          resolve();
                        }
                      });
                    });
                  } catch (saveErr) {
                    console.error('[AUTH_ERROR] Failed to save session:', saveErr);
                    return res.status(401).json({
                      success: false,
                      error: 'AUTH_EXPIRED',
                      message: 'Session refresh failed'
                    });
                  }
                }
                
                try {
                  // Manually login the user (sets req.user)
                  await new Promise<void>((resolve, reject) => {
                    req.login(user, (err) => {
                      if (err) {
                        console.error('Session login error:', err);
                        reject(err);
                      } else {
                        console.log('User logged in via session restoration');
                        resolve();
                      }
                    });
                  });
                  
                  // Return the user data
                  const { password, ...safeUser } = user;
                  
                  // Log success
                  console.log('Session debug after successful recovery:', {
                    hasSession: !!req.session,
                    sessionID: req.sessionID,
                    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
                    passport: req.session?.passport,
                    user: safeUser.username
                  });
                  
                  return res.status(200).json({
                    success: true, 
                    message: 'Session successfully restored',
                    user: safeUser,
                    restored: true
                  });
                } catch (loginErr) {
                  console.error('Login failed during recovery:', loginErr);
                }
              } else {
                console.log(`No user found with ID: ${userId}`);
              }
            } catch (userErr) {
              console.error('Error retrieving user:', userErr);
            }
          }
        } else {
          console.log('No active session found in database for ID:', req.sessionID);
        }
      } catch (error) {
        console.error('Error during session recovery:', error);
      }
    }
    
    // If not authenticated but we have login details in the request body, try to authenticate
    if (req.body.username && req.body.password) {
      console.log('Attempting login during session refresh');
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          console.error('Auth error during refresh:', err);
          return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        
        if (!user) {
          console.log('Authentication failed during refresh:', info?.message);
          return res.status(401).json({ success: false, message: info?.message || 'Invalid credentials' });
        }
        
        req.login(user, (err) => {
          if (err) {
            console.error('Session error during refresh:', err);
            return res.status(500).json({ success: false, message: 'Failed to create session' });
          }
          
          // Remove password from response
          const { password, ...safeUser } = user;
          console.log(`Session refreshed with user: ${user.username}`);
          return res.status(200).json({ 
            success: true, 
            message: 'Session refreshed with new login',
            user: safeUser 
          });
        });
      })(req, res);
      return;
    }
    
    // If not authenticated and no login details, return 401 error
    // This is an authentication failure that should be properly reflected in the status code
    console.error('[AUTH_ERROR] Session refresh failed: not authenticated');
    res.status(401).json({ 
      success: false, 
      error: 'AUTH_EXPIRED', 
      message: 'Session refresh failed'
    });
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
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        console.log(`Username already taken: ${username}`);
        return res.status(409).json({ message: 'Username already taken' });
      }
      
      // Check if email already exists if provided
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          console.log(`Email already in use: ${email}`);
          return res.status(409).json({ message: 'Email already in use' });
        }
      }
      
      // Hash password with simple SHA-256 for better compatibility
      const passwordHash = hashPassword(password);
      
      try {
        // Create user using direct query for full control
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
      } catch (dbError) {
        console.error('Database error during user creation:', dbError);
        return res.status(500).json({ message: 'Error creating user' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}