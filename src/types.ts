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
    type: "and" | "or",
    conditions: (Rule | RuleCondition | string | undefined | null)[]
}

export type RuleStringConditions = {
    type: "and" | "or",
    conditions: (RuleStringConditions | string | undefined | null)[]
}

export type BuildResult = (string | BuildResult)[]

export type CollectionType<FIELDS extends {}, COLLECTIONS extends Record<string, Collection<any, any>>, T = Collection<FIELDS, COLLECTIONS>> = {
    fields: FIELDS,
    f: FIELDS,
    collections: CollectionObjectType<COLLECTIONS>
    c: CollectionObjectType<COLLECTIONS>
}

export type CollectionObjectType<T extends Record<string, Collection<{}, {}>>> = {
    [K in keyof T]: T[K] extends Collection<infer FIELDS, infer COLLECTIONS> ? CollectionType<FIELDS, COLLECTIONS> : never;
};

export type RequiredValidationFunction<DATA_TYPE> = (resourcePath: string, field: Field) => RuleStringConditions;
export type OptionalValidationFunction<DATA_TYPE> = {
    isOptional: true,
    func: RequiredValidationFunction<DATA_TYPE | undefined>
}
export type ValidationFunction<DATA_TYPE> = RequiredValidationFunction<DATA_TYPE> | OptionalValidationFunction<DATA_TYPE>;