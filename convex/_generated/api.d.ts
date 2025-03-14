/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accessWhisper from "../accessWhisper.js";
import type * as createWhisper from "../createWhisper.js";
import type * as deleteExpired from "../deleteExpired.js";
import type * as expireNow from "../expireNow.js";
import type * as fileUploadURL from "../fileUploadURL.js";
import type * as readAccessLog from "../readAccessLog.js";
import type * as readExpiration from "../readExpiration.js";
import type * as readExpirationError from "../readExpirationError.js";
import type * as readSecret from "../readSecret.js";
import type * as recordAccessGeolocation from "../recordAccessGeolocation.js";
import type * as security from "../security.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accessWhisper: typeof accessWhisper;
  createWhisper: typeof createWhisper;
  deleteExpired: typeof deleteExpired;
  expireNow: typeof expireNow;
  fileUploadURL: typeof fileUploadURL;
  readAccessLog: typeof readAccessLog;
  readExpiration: typeof readExpiration;
  readExpirationError: typeof readExpirationError;
  readSecret: typeof readSecret;
  recordAccessGeolocation: typeof recordAccessGeolocation;
  security: typeof security;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
