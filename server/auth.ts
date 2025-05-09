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
    const [hash, salt] = hashedPassword.split('.');
    const newHash = createHash('sha256').update(plainPassword + salt).digest('hex');
    return newHash === hash;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

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
      store: new PgStore({
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

  // Configure local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Find user by username using direct DB connection
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result?.[0];

        // User not found or password doesn't match
        if (!user || !user.password || !comparePasswords(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // User found and password matches
        return done(null, user);
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    })
  );

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    // Ensure we're using the user id as a number
    const userId = parseInt(user.id, 10);
    if (isNaN(userId)) {
      console.error("Invalid user ID for serialization:", user.id);
      return done(new Error("Invalid user ID for serialization"));
    }
    done(null, userId);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      // Use direct DB connection
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      const user = result?.[0];
      
      if (!user) {
        return done(new Error(`User with ID ${id} not found`));
      }
      
      done(null, user);
    } catch (error) {
      console.error("Deserialize user error:", error);
      done(error);
    }
  });

  // Setup authentication routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
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
      
      // Check if username already exists using direct DB connection
      const existingUsers = await query('SELECT * FROM users WHERE username = $1', [username]);
      
      if (existingUsers?.length > 0) {
        return res.status(409).json({ message: "Username already taken" });
      }
      
      // Hash the password
      const hashedPassword = hashPassword(password);
      
      // Insert user with direct DB connection
      const now = new Date();
      const result = await query(
        'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [username, email, hashedPassword, now]
      );
      
      const user = result?.[0];
      
      if (!user) {
        throw new Error('Failed to create user');
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Registration login error:", err);
          return res.status(500).json({ message: "Error during login" });
        }
        
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