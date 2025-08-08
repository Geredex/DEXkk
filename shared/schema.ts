import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  size: integer("size").notNull(), // 16 or 32
  status: text("status").notNull().default("setup"), // setup, active, completed
  currentRound: integer("current_round").default(1),
  totalRounds: integer("total_rounds").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tournamentId: varchar("tournament_id").notNull(),
  position: integer("position").notNull(), // seeding position
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  round: integer("round").notNull(),
  position: integer("position").notNull(), // position in round
  player1Id: varchar("player1_id"),
  player2Id: varchar("player2_id"),
  player1Score: integer("player1_score").default(0),
  player2Score: integer("player2_score").default(0),
  winnerId: varchar("winner_id"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  totalRounds: true,
}).extend({
  size: z.number().min(16).max(32),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  position: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  startTime: true,
  endTime: true,
});

export const updateMatchScoreSchema = z.object({
  player1Score: z.number().min(0),
  player2Score: z.number().min(0),
});

export const completeMatchSchema = z.object({
  winnerId: z.string(),
  player1Score: z.number().min(0),
  player2Score: z.number().min(0),
});

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type UpdateMatchScore = z.infer<typeof updateMatchScoreSchema>;
export type CompleteMatch = z.infer<typeof completeMatchSchema>;
