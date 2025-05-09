import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import crypto from "crypto";

// TEMPORARY SOLUTION: Using a local strategy with hardcoded credentials 
// since we're having issues with OpenID Connect

// Function to create a session store
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "temp-session-secret-for-dev",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Disable secure for development
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

// Import password hash/verify functions directly from storage to ensure consistent behavior
import { comparePasswords } from "./storage";

// Helper function to hash passwords - use the same function from storage
// but wrap it for local use
async function hashPassword(password: string) {
  // Import the same function dynamically to avoid circular dependencies
  const { hashPassword: storageHashPassword } = await import('./storage');
  return storageHashPassword(password);
}

// Use the storage comparePasswords function for verification
async function verifyPassword(candidatePassword: string, hashedPassword: string) {
  return comparePasswords(candidatePassword, hashedPassword);
}

// Function to create a new test user if it doesn't exist
async function createTestUser() {
  try {
    // Check if the test user already exists
    const existingUser = await storage.getUserByUsername("admin");
    
    if (!existingUser) {
      // Create the test user with a hashed password
      const hashedPassword = await hashPassword("admin123");
      
      const newUser = await storage.createUser({
        // Use 'admin' as the user ID - simple and static
        id: "admin",
        username: "admin",
        email: "admin@example.com", 
        password: hashedPassword,
        avatarUrl: "https://ui-avatars.com/api/?name=Admin&background=random",
      });
      
      console.log("Created test user:", newUser.username);
    } else {
      console.log("Test user already exists:", existingUser.username);
    }
  } catch (error) {
    console.error("Error creating test user:", error);
  }
}

// Main function to set up authentication
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Create a test user on startup
  await createTestUser();

  // Set up the LocalStrategy for authentication
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      // Get the user by username
      const user = await storage.getUserByUsername(username);
      
      // If user doesn't exist or password doesn't match, return false
      if (!user || !user.password || !(await verifyPassword(password, user.password))) {
        return done(null, false, { message: "Invalid credentials" });
      }
      
      // Return the user if authentication succeeds
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    console.log(`Serializing user: ${user.username}, id: ${user.id}, type: ${typeof user.id}`);
    
    // Ensure we're storing the ID in the expected format for deserializing later
    done(null, user.id.toString());
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log(`Deserializing user with id: ${id}, type: ${typeof id}`);
      
      // Get the user with the string ID - the storage method handles conversion
      const user = await storage.getUser(id);
      
      if (!user) {
        console.error(`Failed to deserialize user with id: ${id} - no user found`);
        return done(null, false);
      }
      
      console.log(`User deserialized successfully: ${user.username}`);
      done(null, user);
    } catch (error: any) {
      // Safely handle error of unknown type
      const errorMessage = error?.message || 'Unknown error during user deserialization';
      console.error(`Error deserializing user: ${errorMessage}`);
      done(new Error(errorMessage));
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Error during authentication:", err);
        return res.status(500).json({ error: true, message: "Server error", status: 500 });
      }
      
      if (!user) {
        console.log("Login failed:", info?.message || "Invalid credentials");
        return res.status(401).json({ error: true, message: info?.message || "Invalid credentials", status: 401 });
      }
      
      // Log in the user
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Error during login:", loginErr);
          return res.status(500).json({ error: true, message: "Login failed", status: 500 });
        }
        
        // Remove sensitive information
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        
        console.log("User logged in successfully:", user.username);
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Auth check endpoint is now implemented in routes.ts

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).json({ error: true, message: "Logout failed", status: 500 });
      }
      res.sendStatus(200);
    });
  });
}

// Middleware to check if a user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: "Authentication required" });
};