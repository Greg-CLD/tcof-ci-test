import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import crypto from "crypto";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";

// TEMPORARY SOLUTION: Using a local strategy with hardcoded credentials 
// since we're having issues with OpenID Connect

const scryptAsync = promisify(scrypt);

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

// Helper function to hash passwords - matches storage.ts implementation
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Helper function to verify passwords - matches storage.ts implementation
async function verifyPassword(candidatePassword: string, hashedPassword: string) {
  const [hashed, salt] = hashedPassword.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(candidatePassword, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Function to create a new test user if it doesn't exist
async function createTestUser(forceRecreate = false) {
  try {
    // Flag to determine if we need to create a user
    let needToCreateUser = false;
    
    // Check if the test user already exists
    const existingUser = await storage.getUserByUsername("admin");
    
    // If user exists and we want to force recreate, delete it first
    if (existingUser && forceRecreate) {
      console.log("Forcing recreation of test user...");
      // Use direct SQL to delete the user to avoid dependency on schema
      await db.execute(sql`DELETE FROM users WHERE username = 'admin'`);
      console.log("Deleted existing admin user");
      // Set flag to create a new user
      needToCreateUser = true;
    } else if (!existingUser) {
      // No existing user found, need to create one
      needToCreateUser = true;
    }
    
    if (needToCreateUser) {
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
      console.log("Password hash used:", hashedPassword);
      return newUser;
    } else if (existingUser) {
      // We know existingUser is not null at this point since needToCreateUser would be true otherwise
      console.log("Test user already exists:", existingUser.username);
      return existingUser;
    } else {
      // This should never happen given our logic, but added for TypeScript safety
      throw new Error("Failed to create or find test user");
    }
  } catch (error) {
    console.error("Error creating test user:", error);
    throw error; // Re-throw to ensure startup fails if this fails
  }
}

// Main function to set up authentication
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Create a test user on startup - force recreate if the TEST_USER_RESET env var is set
  const forceReset = process.env.TEST_USER_RESET === 'true';
  await createTestUser(forceReset);
  
  // Add route to force recreate the test user with the correct ID format
  app.post("/api/admin/reset-test-user", async (req, res) => {
    try {
      console.log("Forcing a complete reset of the admin user...");
      
      // Use direct SQL for deletion which we know works
      await db.execute(sql`DELETE FROM users WHERE username = 'admin'`);
      console.log("Deleted all existing admin users");
      
      // Now create a fresh admin user with the correct ID type
      const hashedPassword = await hashPassword("admin123");
      
      const newUser = await storage.createUser({
        id: "admin", // Text ID as expected by the new code
        username: "admin",
        email: "admin@example.com", 
        password: hashedPassword
        // Role is handled separately in database
      });
      
      console.log(`Test user recreated successfully: ${newUser.username} with ID ${newUser.id} (type: ${typeof newUser.id})`);
      
      res.status(200).json({ 
        message: "Test user reset successfully", 
        username: newUser.username,
        id: newUser.id,
        idType: typeof newUser.id
      });
    } catch (error: any) {
      console.error("Error resetting test user:", error);
      res.status(500).json({ error: "Failed to reset test user", message: error?.message || "Unknown error" });
    }
  });

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