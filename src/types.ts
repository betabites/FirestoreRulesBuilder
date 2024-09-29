export type Field<T extends string> = {
    dataType: T,
    isOptional?: boolean

    modifyRules?: {}
}

export type StringField = Field<"string">
export type NumberField = Field<"number">
export type BooleanField = Field<"boolean">
export type NullField = Field<"null">
export type TimestampField = Field<"timestamp">
export type GeopointField = Field<"geopoint">
export type ReferenceField = Field<"reference">
export type ArrayField = Field<"array"> & {
    fields: BasicFieldTypes[]
}
export type MapField = Field<"map"> & {
    fields: { [key: string]: BasicFieldTypes }
}

export type BasicFieldTypes = StringField
| NumberField
| BooleanField
| NullField
| TimestampField
| GeopointField
| ReferenceField
| ArrayField
| MapField

export type Collection = {
    fields: {
        [key: string]: BasicFieldTypes
    }
    collections?: Record<string, Collection>
}

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
