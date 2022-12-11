/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * Generated by convex@0.1.10.
 * To regenerate, run `npx convex codegen`.
 * @module
 */

import type {
  DataModelFromSchemaDefinition,
  DocumentMapFromSchemaDefinition,
} from "convex/schema";
import type { TableNamesInDataModel } from "convex/server";
import { GenericId, GenericIdConstructor } from "convex/values";
import schema from "../schema";

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Document<TableName extends TableNames> =
  DocumentMapFromSchemaDefinition<typeof schema>[TableName];

/**
 * An identifier for a document in Convex.
 *
 * Convex documents are uniquely identified by their `Id`, which is accessible
 * on the `_id` field. To learn more, see [Data Modeling](https://docs.convex.dev/using/data-modeling).
 *
 * Documents can be loaded using `db.get(id)` in query and mutation functions.
 *
 * **Important**: Use `myId.equals(otherId)` to check for equality.
 * Using `===` will not work because two different instances of `Id` can refer
 * to the same document.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Id<TableName extends TableNames> = GenericId<TableName>;
export const Id: GenericIdConstructor<TableNames> = GenericId;

/**
 * A type describing your Convex data model.
 *
 * This type includes information about what tables you have, the type of
 * documents stored in those tables, and the indexes defined on them.
 *
 * This type is used to parameterize methods like `queryGeneric` and
 * `mutationGeneric` to make them type-safe.
 */
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
