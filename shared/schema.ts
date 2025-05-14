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
  index,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users table - for authentication and user management 
// MUST use integer ID to match existing database schema
export const users = pgTable("users", {
  id: integer("id").primaryKey(), // Integer ID to match database schema
  username: text("username").notNull(),
  email: text("email"),
  password: text("password"),
  avatarUrl: varchar("avatar_url"),
  notificationPrefs: jsonb("notification_prefs").default('{}'),
  locale: varchar("locale").default('en-US'),
  timezone: varchar("timezone").default('UTC'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Legacy tables needed for compatibility with existing code
export const goalMaps = pgTable("goal_maps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  data: jsonb("data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

export const cynefinSelections = pgTable("cynefin_selections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  data: jsonb("data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

export const tcofJourneys = pgTable("tcof_journeys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  data: jsonb("data").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

// Organisations table
export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organisation memberships table
export const organisationMemberships = pgTable("organisation_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("member"), // 'owner', 'admin', 'member'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userOrgIdx: index("user_org_idx").on(table.userId, table.organisationId),
  };
});

// Organisation heuristics table
export const organisationHeuristics = pgTable("organisation_heuristics", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  successFactor: varchar("success_factor", { length: 255 }).notNull(),
  goal: text("goal"),
  metric: text("metric"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project table - main entity for storing project metadata
// Important: This schema reflects the actual database columns
export const projects = pgTable("projects", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  goalMapId: integer("goal_map_id"),
  cynefinSelectionId: integer("cynefin_selection_id"),
  tcofJourneyId: integer("tcof_journey_id"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Add organisation reference as nullable foreign key
  organisationId: uuid("organisation_id").references(() => organisations.id, { onDelete: "cascade" }),
  // Profile-related fields
  sector: varchar("sector", { length: 100 }),
  customSector: varchar("custom_sector", { length: 100 }),
  industry: varchar("industry", { length: 100 }),
  organisationSize: varchar("organisation_size", { length: 100 }),
  teamSize: varchar("team_size", { length: 100 }),
  currentStage: varchar("current_stage", { length: 100 }),
  isProfileComplete: boolean("is_profile_complete").default(false),
});

// New table for success factor ratings
export const successFactorRatings = pgTable("success_factor_ratings", {
  id: uuid("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  factorId: varchar("factor_id", { length: 255 }).notNull(),
  resonance: integer("resonance").notNull(), // Rating from 1-5
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure unique constraint for project+factor combination
    projectFactorIdx: index("project_factor_idx").on(table.projectId, table.factorId),
  };
});

// New table for personal heuristics
export const personalHeuristics = pgTable("personal_heuristics", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  favourite: boolean("favourite").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    projectIdIdx: index("project_id_idx").on(table.projectId),
  };
});

// Outcomes table - standard outcomes from the framework + custom user outcomes
export const outcomes = pgTable("outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  level: varchar("level", { length: 50 }).notNull(), // e.g. "level1", "level2", "custom"
  isCustom: boolean("is_custom").default(false),
  createdByUserId: integer("created_by_user_id").references(() => users.id), // If created by a user
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

// Project tasks table - stores all tasks for a project
export const projectTasks = pgTable("project_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  stage: varchar("stage", { length: 50 }).notNull(), // 'identification', 'definition', 'delivery', 'closure'
  origin: varchar("origin", { length: 50 }).notNull(), // 'heuristic', 'factor', 'policy', 'custom', 'framework'
  sourceId: varchar("source_id", { length: 255 }).notNull(),
  completed: boolean("completed").default(false),
  notes: text("notes"),
  priority: varchar("priority", { length: 50 }),
  dueDate: varchar("due_date", { length: 50 }),
  owner: varchar("owner", { length: 255 }),
  status: varchar("status", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    projectIdIdx: index("project_tasks_project_id_idx").on(table.projectId),
    stageIdx: index("project_tasks_stage_idx").on(table.stage),
  };
});

// Plan metadata (serialized as JSON in DB, but with schema for validation)
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }),
  blocks: jsonb("blocks").notNull().default(JSON.stringify({
    block1: {
      successFactors: [],
      personalHeuristics: [],
      completed: false
    },
    block2: {
      tasks: [],
      stakeholders: [],
      completed: false
    },
    block3: {
      timeline: null,
      deliveryApproach: "",
      deliveryNotes: "",
      completed: false
    }
  })),
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
  successFactorRatings: many(successFactorRatings),
  personalHeuristics: many(personalHeuristics),
  
  // Add relationship to organisation
  organisation: one(organisations, {
    fields: [projects.organisationId],
    references: [organisations.id]
  }),
  
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

export const successFactorRatingsRelations = relations(successFactorRatings, ({ one }) => ({
  project: one(projects, {
    fields: [successFactorRatings.projectId],
    references: [projects.id]
  }),
}));

export const personalHeuristicsRelations = relations(personalHeuristics, ({ one }) => ({
  project: one(projects, {
    fields: [personalHeuristics.projectId],
    references: [projects.id]
  }),
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

// Add organisation relations
export const organisationsRelations = relations(organisations, ({ many }) => ({
  memberships: many(organisationMemberships),
  projects: many(projects),
  heuristics: many(organisationHeuristics),
}));

export const organisationMembershipsRelations = relations(organisationMemberships, ({ one }) => ({
  user: one(users, {
    fields: [organisationMemberships.userId],
    references: [users.id]
  }),
  organisation: one(organisations, {
    fields: [organisationMemberships.organisationId],
    references: [organisations.id]
  }),
}));

export const organisationHeuristicsRelations = relations(organisationHeuristics, ({ one }) => ({
  organisation: one(organisations, {
    fields: [organisationHeuristics.organisationId],
    references: [organisations.id]
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  plans: many(plans),
  organisationMemberships: many(organisationMemberships),
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

export const projectTasksRelations = relations(projectTasks, ({ one }) => ({
  project: one(projects, {
    fields: [projectTasks.projectId],
    references: [projects.id]
  }),
}));

// Define validation schemas
export const projectInsertSchema = createInsertSchema(projects);
export const projectSelectSchema = createSelectSchema(projects);

export const outcomeInsertSchema = createInsertSchema(outcomes);
export const outcomeSelectSchema = createSelectSchema(outcomes);

export const outcomeProgressInsertSchema = createInsertSchema(outcomeProgress);
export const outcomeProgressSelectSchema = createSelectSchema(outcomeProgress);

// Success factor ratings schemas
export const successFactorRatingInsertSchema = createInsertSchema(successFactorRatings, {
  resonance: (schema) => schema.min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
});
export const successFactorRatingSelectSchema = createSelectSchema(successFactorRatings);

// Personal heuristics schemas
export const personalHeuristicInsertSchema = createInsertSchema(personalHeuristics, {
  name: (schema) => schema.min(1, "Name is required"),
});
export const personalHeuristicSelectSchema = createSelectSchema(personalHeuristics);

// Enhance user schema with validations
export const userInsertSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  email: (schema) => schema.email("Must provide a valid email").optional().nullable(),
  avatarUrl: (schema) => schema.url().optional().nullable(),
  password: (schema) => schema.min(8, "Password must be at least 8 characters").optional(),
});

// Custom update schema for user profile - matches actual database schema
export const userUpdateSchema = z.object({
  email: z.string().email("Must provide a valid email").optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  notificationPrefs: z.record(z.boolean()).optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});

// Schema for password change
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

export const userSelectSchema = createSelectSchema(users);

export const planInsertSchema = createInsertSchema(plans);
export const planSelectSchema = createSelectSchema(plans);

// Project tasks schemas
export const projectTaskInsertSchema = createInsertSchema(projectTasks, {
  text: (schema) => schema.min(1, "Task text is required"),
  stage: (schema) => schema.min(1, "Stage is required"),
  origin: (schema) => schema.min(1, "Origin is required"),
  sourceId: (schema) => schema.min(1, "Source ID is required"),
});
export const projectTaskSelectSchema = createSelectSchema(projectTasks);

// Add organisation schemas
export const organisationInsertSchema = createInsertSchema(organisations);
export const organisationSelectSchema = createSelectSchema(organisations);

export const organisationMembershipInsertSchema = createInsertSchema(organisationMemberships);
export const organisationMembershipSelectSchema = createSelectSchema(organisationMemberships);

export const organisationHeuristicInsertSchema = createInsertSchema(organisationHeuristics);
export const organisationHeuristicSelectSchema = createSelectSchema(organisationHeuristics);

// Define exported types
export type Project = z.infer<typeof projectSelectSchema>;
export type InsertProject = z.infer<typeof projectInsertSchema>;

export type Outcome = z.infer<typeof outcomeSelectSchema>;
export type InsertOutcome = z.infer<typeof outcomeInsertSchema>;

export type OutcomeProgress = z.infer<typeof outcomeProgressSelectSchema>;
export type InsertOutcomeProgress = z.infer<typeof outcomeProgressInsertSchema>;

export type User = z.infer<typeof userSelectSchema>;
export type InsertUser = z.infer<typeof userInsertSchema>;
export type UpdateUser = z.infer<typeof userUpdateSchema>;
export type PasswordChange = z.infer<typeof passwordChangeSchema>;

export type Plan = z.infer<typeof planSelectSchema>;
export type InsertPlan = z.infer<typeof planInsertSchema>;

// Success factor rating types
export type SuccessFactorRating = z.infer<typeof successFactorRatingSelectSchema>;
export type InsertSuccessFactorRating = z.infer<typeof successFactorRatingInsertSchema>;

// Personal heuristic types
export type PersonalHeuristic = z.infer<typeof personalHeuristicSelectSchema>;
export type InsertPersonalHeuristic = z.infer<typeof personalHeuristicInsertSchema>;

// Add organisation types
export type Organisation = z.infer<typeof organisationSelectSchema>;
export type InsertOrganisation = z.infer<typeof organisationInsertSchema>;

export type OrganisationMembership = z.infer<typeof organisationMembershipSelectSchema>;
export type InsertOrganisationMembership = z.infer<typeof organisationMembershipInsertSchema>;

export type OrganisationHeuristic = z.infer<typeof organisationHeuristicSelectSchema>;

// Success Factors - Define stage enum
export const stageEnum = pgEnum('success_factor_stage', [
  'Identification',
  'Definition',
  'Delivery',
  'Closure'
]);

// Success Factors - Main table
export const successFactors = pgTable('success_factors', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(), // Using varchar rather than uuid to match existing sf-X format
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Success Factors - Tasks table
export const successFactorTasks = pgTable('success_factor_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  factorId: varchar('factor_id', { length: 36 }).notNull()
    .references(() => successFactors.id, { onDelete: 'cascade' }),
  stage: stageEnum('stage').notNull(),
  text: text('text').notNull(),
  order: integer('order').notNull(), // To preserve ordering within each stage
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Define relations for success factors
export const successFactorsRelations = relations(successFactors, ({ many }) => ({
  tasks: many(successFactorTasks)
}));

export const successFactorTasksRelations = relations(successFactorTasks, ({ one }) => ({
  factor: one(successFactors, {
    fields: [successFactorTasks.factorId],
    references: [successFactors.id]
  })
}));

// Create Zod schemas for success factors
export const successFactorsInsertSchema = createInsertSchema(successFactors);
export const successFactorsSelectSchema = createSelectSchema(successFactors);

export const successFactorTasksInsertSchema = createInsertSchema(successFactorTasks);
export const successFactorTasksSelectSchema = createSelectSchema(successFactorTasks);

export type SuccessFactorInsert = z.infer<typeof successFactorsInsertSchema>;
export type SuccessFactorSelect = z.infer<typeof successFactorsSelectSchema>;
export type SuccessFactorTaskInsert = z.infer<typeof successFactorTasksInsertSchema>;
export type SuccessFactorTaskSelect = z.infer<typeof successFactorTasksSelectSchema>;

// Custom type for the expected API response format
export type SuccessFactorWithTasks = {
  id: string;
  title: string;
  description: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
};
export type InsertOrganisationHeuristic = z.infer<typeof organisationHeuristicInsertSchema>;

export type ProjectTask = z.infer<typeof projectTaskSelectSchema>;
export type InsertProjectTask = z.infer<typeof projectTaskInsertSchema>;