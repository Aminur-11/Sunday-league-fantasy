import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores and hyphens",
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long");

export const teamNameSchema = z
  .string()
  .trim()
  .min(2, "Team name must be at least 2 characters")
  .max(40, "Team name must be at most 40 characters");

export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const playerPositionSchema = z.enum(["DEF", "MID", "FWD"]);

export const playerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  position: playerPositionSchema,
  price: z.coerce.number().min(0, "Price must be zero or more").max(999),
  active: z.boolean().optional(),
});

export const teamSelectionSchema = z.object({
  playerIds: z.array(z.string()).length(7, "You need exactly 7 players"),
  captainId: z.string().min(1, "Select a captain"),
  teamName: teamNameSchema.optional(),
});
