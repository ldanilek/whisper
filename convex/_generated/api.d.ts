/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * Generated by convex@1.5.0-alpha.0.
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accessWhisper from "../accessWhisper";
import type * as createWhisper from "../createWhisper";
import type * as deleteExpired from "../deleteExpired";
import type * as expireNow from "../expireNow";
import type * as fileUploadURL from "../fileUploadURL";
import type * as readAccessLog from "../readAccessLog";
import type * as readExpiration from "../readExpiration";
import type * as readExpirationError from "../readExpirationError";
import type * as readSecret from "../readSecret";
import type * as recordAccessGeolocation from "../recordAccessGeolocation";
import type * as security from "../security";

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
