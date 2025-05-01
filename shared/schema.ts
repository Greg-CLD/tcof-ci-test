import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User data storage for goal mapping data
export const goalMaps = pgTable("goal_maps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull().default("Untitled Goal Map"),
  data: jsonb("data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User data storage for cynefin selection data
export const cynefinSelections = pgTable("cynefin_selections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull().default("Untitled Cynefin Selection"),
  data: jsonb("data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User data storage for TCOF journey data
export const tcofJourneys = pgTable("tcof_journeys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull().default("Untitled TCOF Journey"),
  data: jsonb("data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Project sets to group related data together
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  goalMapId: integer("goal_map_id").references(() => goalMaps.id),
  cynefinSelectionId: integer("cynefin_selection_id").references(() => cynefinSelections.id),
  tcofJourneyId: integer("tcof_journey_id").references(() => tcofJourneys.id),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  goalMaps: many(goalMaps),
  cynefinSelections: many(cynefinSelections),
  tcofJourneys: many(tcofJourneys),
  projects: many(projects),
}));

export const goalMapsRelations = relations(goalMaps, ({ one }) => ({
  user: one(users, { fields: [goalMaps.userId], references: [users.id] }),
}));

export const cynefinSelectionsRelations = relations(cynefinSelections, ({ one }) => ({
  user: one(users, { fields: [cynefinSelections.userId], references: [users.id] }),
}));

export const tcofJourneysRelations = relations(tcofJourneys, ({ one }) => ({
  user: one(users, { fields: [tcofJourneys.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  goalMap: one(goalMaps, { fields: [projects.goalMapId], references: [goalMaps.id] }),
  cynefinSelection: one(cynefinSelections, { fields: [projects.cynefinSelectionId], references: [cynefinSelections.id] }),
  tcofJourney: one(tcofJourneys, { fields: [projects.tcofJourneyId], references: [tcofJourneys.id] }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertGoalMapSchema = createInsertSchema(goalMaps).pick({
  userId: true,
  name: true,
  data: true,
});

export const insertCynefinSelectionSchema = createInsertSchema(cynefinSelections).pick({
  userId: true,
  name: true,
  data: true,
});

export const insertTcofJourneySchema = createInsertSchema(tcofJourneys).pick({
  userId: true,
  name: true,
  data: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  userId: true,
  name: true,
  description: true,
  goalMapId: true,
  cynefinSelectionId: true,
  tcofJourneyId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GoalMap = typeof goalMaps.$inferSelect;
export type CynefinSelection = typeof cynefinSelections.$inferSelect;
export type TcofJourney = typeof tcofJourneys.$inferSelect;
export type Project = typeof projects.$inferSelect;
