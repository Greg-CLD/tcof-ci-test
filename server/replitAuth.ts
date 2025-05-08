import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    console.log("Discovering OpenID configuration with REPL_ID:", process.env.REPL_ID);
    try {
      return await client.discovery(
        // Always use HTTPS for discovery
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    } catch (error) {
      console.error("Error discovering OpenID configuration:", error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

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
      // Set secure to false in development to allow non-HTTPS cookies
      secure: false,
      maxAge: sessionTtl,
      sameSite: 'lax', // Allows for cross-site requests while still providing some CSRF protection
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  try {
    console.log("Upserting user with claims:", JSON.stringify(claims, null, 2));
    
    // Only include fields that actually exist in the database schema
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      username: claims["email"]?.split('@')[0] || `user-${claims["sub"]}`, // Generate username if not available
      avatarUrl: claims["profile_image_url"] // Use avatarUrl instead of profileImageUrl
    });
    console.log("User upserted successfully");
  } catch (error) {
    console.error("Error in upsertUser:", error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();
  console.log("OIDC Config received:", config.issuer);

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      console.error("Error in verify function:", error);
      verified(error as Error);
    }
  };

  // Register a single strategy with a generic name
  const strategy = new Strategy(
    {
      name: "replit",
      config,
      scope: "openid email profile offline_access",
      // Dynamically determine callback URL based on request
      callbackURL: "/api/callback",
    },
    verify,
  );
  passport.use(strategy);
  console.log("Registered generic Replit auth strategy");

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log("Login request from:", req.hostname);
    
    // Use the simplified strategy with dynamic callback URL
    const protocol = req.protocol || "https";
    const fullUrl = `${protocol}://${req.headers.host}`;
    console.log(`Full base URL: ${fullUrl}`);
    
    passport.authenticate("replit", {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
      callbackURL: `${fullUrl}/api/callback`,
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("Auth callback received", req.query);
    
    // Set a cookie to indicate we've attempted the callback
    res.cookie('auth_callback_attempted', 'true', { 
      maxAge: 60000, // 1 minute
      httpOnly: true,
      sameSite: 'lax'
    });

    // Determine the full callback URL to match login request
    const protocol = req.protocol || "https";
    const fullCallbackUrl = `${protocol}://${req.headers.host}/api/callback`;
    console.log(`Using callback URL: ${fullCallbackUrl}`);
    
    try {
      passport.authenticate("replit", {
        callbackURL: fullCallbackUrl,
        successReturnToOrRedirect: "/",
        failureRedirect: "/?auth_failed=true",
      })(req, res, (err) => {
        if (err) {
          console.error("Authentication error:", err);
          
          // Extract error info for client-side handling
          const errorInfo = {
            message: err.message || 'Unknown error',
            code: err.code || 'NO_CODE',
          };
          console.log("Error info:", errorInfo);
          
          // Redirect to home with error info
          const encodedErrorMessage = encodeURIComponent(errorInfo.message);
          return res.redirect(`/?auth_error=${encodedErrorMessage}`);
        }
        next();
      });
    } catch (error: any) {
      console.error("Unexpected error in auth callback:", error);
      return res.redirect(`/?auth_error=${encodeURIComponent(error?.message || 'Authentication error')}`);
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      // Build the full URL for the post-logout redirect
      const protocol = req.protocol || "https";
      const fullUrl = `${protocol}://${req.headers.host}`;
      
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: fullUrl,
        }).href
      );
    });
  });

  // Return user data endpoint
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.redirect("/api/login");
  }
};