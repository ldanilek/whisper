import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  whispers: defineTable({
    name: v.string(),
    // Encrypted with password.
    encryptedSecret: v.string(),
    // Encrypted with password.
    encryptedSender: v.optional(v.string()),
    // Zero or more files, each encrypted with the whisper password.
    storageIds: v.optional(v.array(v.string())),
    // So recipient can prove to server (in accessWhisper) that they are allowed
    // to read the secret.
    passwordHash: v.string(),
    // So creator can prove that they can configure the secret and read accesses.
    creatorKey: v.string(),
    // Whether to request geolocation on access
    requestGeolocation: v.optional(v.boolean()),

    expiration: v.string(),
    // Set only for the custom expiration options that need them.
    // Unix timestamp in milliseconds.
    expiresAt: v.optional(v.number()),
    maxAccesses: v.optional(v.number()),
  }).index('by_name', ['name']),
  accesses: defineTable({
    name: v.string(),
    accessKey: v.string(),
    geolocation: v.optional(v.union(v.string(), v.null())),
    ip: v.optional(v.union(v.string(), v.null())),
  })
    .index('by_name_and_key', ['name', 'accessKey'])
    .index('by_name_and_creation', ['name']),
  accessFailures: defineTable({
    name: v.string(),
    accessKey: v.string(),
    reason: v.string(),
    geolocation: v.union(v.string(), v.null()),
    ip: v.union(v.string(), v.null()),
  })
    .index('by_name_and_key', ['name', 'accessKey'])
    .index('by_name_and_creation', ['name']),
});
