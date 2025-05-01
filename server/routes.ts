import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";

// Initialize Stripe with your secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup basic health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Route for creating a checkout session for the Starter Kit (£9)
  app.post("/api/checkout-starter", async (req: Request, res: Response) => {
    try {
      // Create a checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: "TCOF Starter Kit Access",
                description: "Access to the TCOF Starter Kit tools",
              },
              unit_amount: 900, // £9.00 in pence
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/tools/starter-access?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/`,
      });

      // Log the URL for debugging
      console.log("Stripe checkout URL:", session.url);
      
      res.status(200).json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        error: {
          message: error.message || "An error occurred with the checkout process.",
        },
      });
    }
  });

  // For Stripe webhooks, we'd need a raw parser middleware but 
  // for simplicity we'll skip detailed webhook implementation
  app.post("/api/webhook-event", async (req: Request, res: Response) => {
    try {
      const { type, data } = req.body;
      
      if (type === "checkout.session.completed") {
        const session = data.object;
        console.log("Payment successful for session:", session.id);
        // Here you would typically update your database with user's payment info
      }
      
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
