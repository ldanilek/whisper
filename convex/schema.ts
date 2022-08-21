import { defineSchema, defineTable, s } from "convex/schema";

export default defineSchema({
  whispers: defineTable({
    name: s.string(),
    // Encrypted with password.
    encryptedSecret: s.string(),
    // So recipient can prove to server (in accessWhisper) that they are allowed
    // to read the secret.
    passwordHash: s.string(),
    // So creator can prove that they can configure the secret and read accesses.
    creatorKey: s.string(),

    expiration: s.string(),
  }).index('by_name', ['name']),
  accesses: defineTable({
    name: s.string(),
    accessKey: s.string(),
    geolocation: s.union(s.string(), s.null()),
    ip: s.union(s.string(), s.null()),
  })
  .index('by_name_and_key', ['name', 'accessKey'])
  .index('by_name_and_creation', ['name', '_creationTime']),
});
