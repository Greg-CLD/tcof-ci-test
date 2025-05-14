import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { db } from "./db";
import { db as directDb, query } from "./direct-db"; // Import direct DB connection
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";

// Get PostgreSQL session store
const PgStore = connectPg(session);

// Helper function to hash passwords 
function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = createHash('sha256');
  hash.update(password + salt);
  return hash.digest('hex') + '.' + salt;
}

// Helper function to compare passwords
function comparePasswords(plainPassword: string, hashedPassword: string): boolean {
  try {
    // Log format for debugging
    console.log('Password format check:', {
      hasFormat: hashedPassword.includes('.'),
      length: hashedPassword.length
    });
    
    // Check if the hash uses the new format with salt
    if (hashedPassword.includes('.')) {
      const [hash, salt] = hashedPassword.split('.');
      const newHash = createHash('sha256').update(plainPassword + salt).digest('hex');
      return newHash === hash;
    } 
    // Handle the longer format with salt embedded but without period separator
    else if (hashedPassword.length > 128) {
      // For the ca35995... format (SHA-256 + salt) without explicit separator
      // Assume salt is in the last 32 characters and hash is the rest
      const salt = hashedPassword.substring(hashedPassword.length - 32);
      const hash = hashedPassword.substring(0, hashedPassword.length - 32);
      
      const newHash = createHash('sha256').update(plainPassword + salt).digest('hex');
      return newHash === hash;
    }
    // For any other formats
    else {
      // Basic SHA-256 hash without salt
      const newHash = createHash('sha256').update(plainPassword).digest('hex');
      return newHash === hashedPassword;
    }
    
  } catch (error) {
    console.error('Password comparison error:', error, 'for hash:', hashedPassword);
    return false;
  }
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log('Authentication check:', {
    hasReqUser: !!req.user,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    sessionID: req.sessionID,
    hasSession: !!req.session,
    path: req.path
  });
  
  if (req.isAuthenticated()) {
    return next();
  }
  
  console.log('Authentication failed, redirecting to login');
  res.status(401).json({ message: "Authentication required" });
}

export function setupAuth(app: Express) {
  // Set trust proxy to work properly with Replit's infrastructure
  app.set('trust proxy', 1);
  
  // Configure session middleware with improved persistence for Replit
  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        tableName: 'sessions'
      }),
      secret: process.env.SESSION_SECRET || 'tcof-dev-secret',
      resave: true, // Changed to true to ensure session is always saved
      saveUninitialized: true, // Changed to true to create session early
      rolling: true, // Reset expiration with every response
      name: 'tcof.sid', // Set consistent name for the session cookie
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Secure in production only
        sameSite: 'lax',
        path: '/'
      }
    })
  );
  
  // Initialize passport - must come after session but before our own middleware
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Debug middleware to track session data - important: this comes AFTER passport initialization
  app.use((req, res, next) => {
    const sessionData = req.session as any;
    console.log('Session debug:', { 
      hasSession: !!req.session,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      passport: sessionData?.passport,
      cookie: sessionData?.cookie
    });
    next();
  });

  // Configure local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Local strategy authenticating:", username);
        
        // Try to find user by username OR email
        console.log("Executing SQL query to find user:", 
          'SELECT * FROM users WHERE username = $1 OR email = $1', 
          [username]);
        
        try {
          // Get user with direct query
          const result = await query(
            'SELECT * FROM users WHERE username = $1 OR email = $1', 
            [username]
          );
          
          // Log the entire result for debugging
          console.log("Raw database result:", JSON.stringify(result));
          
          const user = result?.[0];
          
          // Log user object if found
          if (user) {
            console.log("User found:", {
              id: user.id,
              username: user.username,
              email: user.email,
              hasPassword: !!user.password,
              passwordLength: user.password ? user.password.length : 0
            });
          } else {
            console.log("No user found with username or email:", username);
          }
          
          // User not found
          if (!user) {
            console.log("Authentication failed: User not found");
            return done(null, false, { message: "Invalid username or password" });
          }
          
          // No password set
          if (!user.password) {
            console.log("Authentication failed: User has no password set");
            return done(null, false, { message: "Invalid username or password" });
          }
          
          // Log password details for debugging
          console.log("Stored password format:", {
            raw: user.password,
            length: user.password.length,
            containsSeparator: user.password.includes('.')
          });
          
          // Check password match
          console.log("Comparing passwords:", {
            plainPassword: password,
            hashedPasswordFormat: user.password.substring(0, 10) + '...'
          });
          
          const passwordMatches = comparePasswords(password, user.password);
          console.log("Password check result:", passwordMatches ? "Match" : "No match");
          
          if (!passwordMatches) {
            return done(null, false, { message: "Invalid username or password" });
          }
          
          // User found and password matches
          console.log("Authentication successful for user:", user.username, "ID:", user.id);
          return done(null, user);
        } catch (dbError) {
          console.error("Database error during user lookup:", dbError);
          return done(dbError);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    })
  );

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    // Accept any ID type (number or string)
    if (user && user.id !== undefined) {
      console.log("Serializing user:", user.id, user.username);
      
      // Store just the ID for better compatibility and session size
      return done(null, user.id);
    } else {
      console.error("Invalid user object for serialization:", user);
      return done(new Error("Invalid user object for serialization"));
    }
  });

  // Cache deserialization results for better performance
  const userCache = new Map<string | number, any>();
  
  passport.deserializeUser(async (id: any, done) => {
    try {
      if (!id) {
        console.error("No valid user ID for deserialization");
        return done(null, false);
      }
      
      // Check cache first (5 minute TTL)
      const cacheKey = id.toString();
      const cachedUser = userCache.get(cacheKey);
      if (cachedUser) {
        console.log("User found in cache:", cachedUser.username);
        return done(null, cachedUser);
      }
      
      console.log("Fetching user details for ID:", id);
      
      // Get user with direct query
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      console.log("Deserialize user query result:", result ? "found" : "not found");
      
      const user = result?.[0];
      
      if (!user) {
        console.error(`User with ID ${id} not found during deserialization`);
        return done(null, false); // Don't throw an error, just return false
      }
      
      // Cache user for 5 minutes
      userCache.set(cacheKey, user);
      setTimeout(() => userCache.delete(cacheKey), 5 * 60 * 1000);
      
      console.log("User found:", user.username);
      return done(null, user);
    } catch (error) {
      console.error("Deserialize user error:", error);
      return done(error);
    }
  });

  // Setup authentication routes
  app.post("/api/login", (req, res, next) => {
    // Log detailed request data for debugging
    console.log('→ Headers:', req.headers);
    console.log('→ Body:', req.body);
    
    // Validate required fields
    if (!req.body.username || !req.body.password) {
      console.error("Missing login credentials");
      return res.status(401).json({ message: "Missing credentials" });
    }
    
    // Log the exact SQL that will be executed
    console.log('→ SQL query will be: SELECT * FROM users WHERE username = $1 OR email = $1');
    console.log('→ With parameter:', req.body.username);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        console.error("Login failed for user:", req.body.username, "Info:", info);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      // Log successful authentication with user details (except password)
      const { password, ...debugUser } = user;
      console.log("User authenticated successfully:", debugUser);
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log("Session created for:", {
          id: user.id,
          username: user.username,
          sessionID: req.sessionID,
          hasSession: !!req.session
        });
        
        // Debug the state of req.isAuthenticated after login
        console.log("isAuthenticated after login:", req.isAuthenticated());
        console.log("Session passport value:", (req.session as any)?.passport);
        
        // Don't send the password to the client
        const { password, ...safeUser } = user;
        return res.status(200).json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Don't send the password to the client
    const { password, ...safeUser } = req.user as any;
    res.status(200).json(safeUser);
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      // Basic validation
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      console.log("Registration attempt for:", username, email ? "(with email)" : "(no email)");
      
      // Check if username already exists using direct DB connection
      const existingUsers = await query('SELECT * FROM users WHERE username = $1', [username]);
      
      if (existingUsers?.length > 0) {
        console.log("Registration failed - username already taken:", username);
        return res.status(409).json({ message: "Username already taken" });
      }
      
      // Hash the password
      const hashedPassword = hashPassword(password);
      
      console.log("Creating new user:", username);
      
      // Insert user with direct DB connection and let the DB generate an ID
      const now = new Date();
      const result = await query(
        'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [username, email || null, hashedPassword, now]
      );
      
      const user = result?.[0];
      
      if (!user) {
        console.error("User creation failed - no user returned from query");
        throw new Error('Failed to create user');
      }
      
      console.log("User created successfully with ID:", user.id);
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Registration login error:", err);
          return res.status(500).json({ message: "Error during login" });
        }
        
        console.log("New user logged in successfully:", user.username);
        
        // Don't send the password to the client
        const { password, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}