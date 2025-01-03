import {Collection} from "./collections/Collection.js";
import {Field} from "./fields/Field.js";

export type FieldRuleReference = {
    field: "this" | string
    collectionRef?: string
}

export type Operators = "<"
| "<="
| "=="
| ">"
| ">="
| "!="
| "array-contains"
| "array-contains-any"
| "in"
| "not-in"
| "is"

export type RuleCondition = [FieldRuleReference | string, Operators, FieldRuleReference | string]

export type Rule = {
    type: "and" | "or" | "not",
    conditions: (Rule | RuleCondition | string | undefined | null)[],
}

export type RuleStringConditions = {
    type: "and" | "or" | "not",
    conditions: (RuleStringConditions | string | undefined | null)[],
}

export type BuildResult = (string | BuildResult)[]

export type CollectionType<
    NAME extends string,
    FIELDS extends Record<string, ValidationFunction<any>>,
    COLLECTIONS extends Collection<string, any, any>[],
    T = Collection<NAME, FIELDS, COLLECTIONS>> = {
    fields: InferFields<FIELDS>,
    f: InferFields<FIELDS>,
    collections: CollectionObjectType<COLLECTIONS>
    c: CollectionObjectType<COLLECTIONS>
}
/**
 * Expands a given type by resolving its structure one level deep.
 *
 * TypeScript often leaves generics unevaluated in error messages, making it
 * difficult to see the full structure of a type. Wrapping a type with `Expand`
 * forces TypeScript to compute and display the expanded shape of the type,
 * improving readability in error messages and tooltips.
 *
 * @template T - The type to expand.
 * @returns A new type where all properties of `T` are resolved to their original values.
 *
 * @example
 * type OriginalType = { ABC: string; DEF: number; };
 * type ExpandedType = Expand<OriginalType>;
 * // ExpandedType will resolve to: { ABC: string; DEF: number; }
 */
type Expand<T> = T extends infer O ? {[K in keyof O]: O[K]} : never;

export type InferFields<FIELDS extends Record<string, ValidationFunction<any>>> = Expand<{
    [K in keyof FIELDS]: FIELDS[K] extends ValidationFunction<infer DATA>
        ? (DATA extends Record<string, ValidationFunction<any>> ? InferFields<DATA> : DATA)
        : never
}>

    // {[K in keyof T]-?: undefined extends T[K] ? never : T[K]}
    // & Partial<T>

export type ConvertToOptional<FIELDS extends Record<string, any>> = {
    [K in keyof FIELDS]-?: undefined extends FIELDS[K]
        ? FIELDS[K] : FIELDS[K]
}

export type CollectionArray = Collection<string, {}, CollectionArray>[]

// export type CollectionObjectType<T extends CollectionArray> = {
//     [K in keyof T]: T[K] extends Collection<infer NAME, infer FIELDS, infer COLLECTIONS> ?
//         CollectionType<NAME, FIELDS, COLLECTIONS> : never;
// }[number];

export type CollectionObjectType<T extends CollectionArray> = {
    [K in T[number] as K["name"]]: CollectionType<K["name"], K["fields"], K["collections"]>
}


export type RequiredValidationFunction<DATA_TYPE> = (resourcePath: string, field: Field, currentFieldName?: string) => RuleStringConditions;
export type OptionalValidationFunction<DATA_TYPE> = {
    isOptional: true,
    func: RequiredValidationFunction<DATA_TYPE | undefined>
}
export type ValidationFunction<DATA_TYPE> = RequiredValidationFunction<DATA_TYPE> | OptionalValidationFunction<DATA_TYPE>;
