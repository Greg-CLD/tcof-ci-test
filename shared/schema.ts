import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  primaryKey,
  jsonb,
  boolean,
  real,
  uuid,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Legacy tables needed for compatibility with existing code
export const goalMaps = pgTable("goal_maps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  data: jsonb("data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

export const cynefinSelections = pgTable("cynefin_selections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  data: jsonb("data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

export const tcofJourneys = pgTable("tcof_journeys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  data: jsonb("data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

// Project table - main entity for storing project metadata
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sector: varchar("sector", { length: 100 }),
  customSector: varchar("custom_sector", { length: 100 }),
  orgType: varchar("org_type", { length: 100 }),
  teamSize: varchar("team_size", { length: 100 }),
  currentStage: varchar("current_stage", { length: 100 }),
  selectedOutcomeIds: jsonb("selected_outcome_ids").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  // Legacy fields for compatibility
  userId: integer("user_id"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  goalMapId: integer("goal_map_id"),
  cynefinSelectionId: integer("cynefin_selection_id"),
  tcofJourneyId: integer("tcof_journey_id"),
});

// Outcomes table - standard outcomes from the framework + custom user outcomes
export const outcomes = pgTable("outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  level: varchar("level", { length: 50 }).notNull(), // e.g. "level1", "level2", "custom"
  isCustom: boolean("is_custom").default(false),
  createdByUserId: integer("created_by_user_id"), // If created by a user
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Outcome Progress table - tracks progress values for project outcomes
export const outcomeProgress = pgTable("outcome_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  outcomeId: uuid("outcome_id").notNull().references(() => outcomes.id),
  value: integer("value").notNull(), // Progress value (0-100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    projectOutcomeIdx: index("project_outcome_idx").on(table.projectId, table.outcomeId),
  };
});

// Users table - for authentication and user management
// Note: This schema now matches the actual database structure
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Plan metadata (serialized as JSON in DB, but with schema for validation)
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Session table for login sessions (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Define table relationships
export const projectsRelations = relations(projects, ({ many, one }) => ({
  plans: many(plans),
  outcomeProgress: many(outcomeProgress),
  
  // Legacy relationships
  goalMap: one(goalMaps, {
    fields: [projects.goalMapId],
    references: [goalMaps.id]
  }),
  cynefinSelection: one(cynefinSelections, {
    fields: [projects.cynefinSelectionId],
    references: [cynefinSelections.id]
  }),
  tcofJourney: one(tcofJourneys, {
    fields: [projects.tcofJourneyId],
    references: [tcofJourneys.id]
  })
}));

export const outcomesRelations = relations(outcomes, ({ many }) => ({
  progress: many(outcomeProgress),
}));

export const outcomeProgressRelations = relations(outcomeProgress, ({ one }) => ({
  project: one(projects, {
    fields: [outcomeProgress.projectId],
    references: [projects.id]
  }),
  outcome: one(outcomes, {
    fields: [outcomeProgress.outcomeId],
    references: [outcomes.id]
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  plans: many(plans),
}));

export const plansRelations = relations(plans, ({ one }) => ({
  project: one(projects, {
    fields: [plans.projectId],
    references: [projects.id]
  }),
  user: one(users, {
    fields: [plans.userId],
    references: [users.id]
  }),
}));

// Define validation schemas
export const projectInsertSchema = createInsertSchema(projects);
export const projectSelectSchema = createSelectSchema(projects);

export const outcomeInsertSchema = createInsertSchema(outcomes);
export const outcomeSelectSchema = createSelectSchema(outcomes);

export const outcomeProgressInsertSchema = createInsertSchema(outcomeProgress);
export const outcomeProgressSelectSchema = createSelectSchema(outcomeProgress);

export const userInsertSchema = createInsertSchema(users);
export const userSelectSchema = createSelectSchema(users);

export const planInsertSchema = createInsertSchema(plans);
export const planSelectSchema = createSelectSchema(plans);

// Define exported types
export type Project = z.infer<typeof projectSelectSchema>;
export type InsertProject = z.infer<typeof projectInsertSchema>;

export type Outcome = z.infer<typeof outcomeSelectSchema>;
export type InsertOutcome = z.infer<typeof outcomeInsertSchema>;

export type OutcomeProgress = z.infer<typeof outcomeProgressSelectSchema>;
export type InsertOutcomeProgress = z.infer<typeof outcomeProgressInsertSchema>;

export type User = z.infer<typeof userSelectSchema>;
export type InsertUser = z.infer<typeof userInsertSchema>;

export type Plan = z.infer<typeof planSelectSchema>;
export type InsertPlan = z.infer<typeof planInsertSchema>;