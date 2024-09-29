import {FieldRuleReference, Rule, RuleCondition, RuleStringConditions} from "../types.js";
import {removeBlankConditions} from "../removeBlankConditions.js";
import {type DocumentReference} from "firebase/firestore";

type EditableTypes = "always"
| "creationOnly"
| "modificationOnly"
| "never"

/*
 * Data types are defined based on the types described in this video; https://www.youtube.com/watch?v=qbd_4LT0Y4s
 * Enum is the only exception to this.
 */
enum FieldTypes {
    NULL,
    ANY,
    STRING,
    INTEGER,
    FLOAT,
    NUMBER,
    BOOLEAN,
    TIMESTAMP,
    DURATION,
    PATH,
    LATLNG,
    REFERENCE,
    LIST,
    MAP,
    ENUM
}

export type BasicField<T = never> = {
    name: string,
    isOptional: boolean,
    _buildRules(resource: string): RuleStringConditions
}

type Append<OLD_TYPES, NEW_TYPE> = Field<Exclude<OLD_TYPES, never> | NEW_TYPE>

export class Field<T = never> implements BasicField<T> {
    #editableType: EditableTypes
    #fieldTypeRules = new Map<FieldTypes, Rule | RuleCondition | FieldMap | Field | null>()
    readonly name: string
    isOptional = false

    constructor(name: string, editable?: EditableTypes) {
        this.#editableType = editable ?? "always"
        this.name = name
    }
    optional(): Append<this, undefined> { this.isOptional = true; return this }
    any(rule: Rule | RuleCondition | null = null): Omit<
        Append<T, any>,
        "nullable"
        | "string"
        | "integer"
        | "float"
        | "number"
        | "boolean"
        | "timestamp"
        | "duration"
        | "latlng"
        | "path"
        | "enum"
        | "array"
        | "map"
    > { this.#fieldTypeRules.set(FieldTypes.ANY, rule); return this }
    nullable(rule: Rule | RuleCondition | null = null): Append<T, null> { this.#fieldTypeRules.set(FieldTypes.NULL, rule); return this }
    string(rule: Rule | RuleCondition | null = null): Append<T, string> { this.#fieldTypeRules.set(FieldTypes.STRING, rule); return this }
    integer(rule: Rule | RuleCondition | null = null): Append<T, number> { this.#fieldTypeRules.set(FieldTypes.INTEGER, rule); return this }
    float(rule: Rule | RuleCondition | null = null): Append<T, number> { this.#fieldTypeRules.set(FieldTypes.FLOAT, rule); return this }
    number(rule: Rule | RuleCondition | null = null): Append<T, number> { this.#fieldTypeRules.set(FieldTypes.NUMBER, rule); return this }
    boolean(rule: Rule | RuleCondition | null = null): Append<T, boolean> { this.#fieldTypeRules.set(FieldTypes.BOOLEAN, rule); return this }
    timestamp(rule: Rule | RuleCondition | null = null): Append<T, Date> { this.#fieldTypeRules.set(FieldTypes.TIMESTAMP, rule); return this }
    duration(rule: Rule | RuleCondition | null = null): Append<T, number> { this.#fieldTypeRules.set(FieldTypes.DURATION, rule); return this }
    latlng(rule: Rule | RuleCondition | null = null): Append<T, {latitude: number, longitude: number}> { this.#fieldTypeRules.set(FieldTypes.LATLNG, rule); return this }
    path(rule: Rule | RuleCondition | null = null): Append<T, DocumentReference> { this.#fieldTypeRules.set(FieldTypes.PATH, rule); return this }
    enum<T extends number | string>(values: T[], rule: Rule | RuleCondition | null = null): Append<T, T> {
        let _rule: Rule = {
            type: "and",
            conditions: [
                [{field: "this"}, "in", JSON.stringify(values)],
                rule
            ]
        }
        this.#fieldTypeRules.set(FieldTypes.ENUM, _rule); return this
    }
    nativeEnum<T extends {[key: string | number]: string | number}>(values: T, rule: Rule | RuleCondition | null = null): Append<T, T> {
        return this.enum(Object.values(values), rule)
    }
    list<V>(builder: (field: Field) => Field<V>, rule: Rule | RuleCondition | null = null): Append<T, V[]> {
        this.#fieldTypeRules.set(FieldTypes.LIST, builder(new Field<never>("element"))); return this
    }
    map(builder: (map: FieldMap) => FieldMap): Append<T, unknown> { this.#fieldTypeRules.set(FieldTypes.MAP, builder(new FieldMap(this.name))); return this }

    _transposeRuleResource(resourcePath: string, fieldRuleResource: FieldRuleReference | string) {
        if (typeof fieldRuleResource === "string") return fieldRuleResource
        else if (fieldRuleResource.field === "this") return `${resourcePath}${this.name}`
        else if (fieldRuleResource.collectionRef) return `get(${fieldRuleResource}).data.${this.name}`
        return `${resourcePath}${fieldRuleResource.field}`
    }

    _transposeCondition(resourcePath: string, condition: RuleCondition) {
        return `${this._transposeRuleResource(resourcePath, condition[0])} ${condition[1]} ${this._transposeRuleResource(resourcePath, condition[2])}`
    }

    _transposeRule(resourcePath: string, rule: Rule) {
        // Safely transpose a rule
        let _rule = JSON.parse(JSON.stringify(rule)) as Rule

        _rule.conditions = removeBlankConditions(_rule.conditions).map(condition => {
            if (typeof condition === "string") return condition
            else if (Array.isArray(condition)) return this._transposeCondition(resourcePath, condition)
            return this._transposeRule(resourcePath, condition)
        })
        return _rule as RuleStringConditions
    }

    _buildRules(resource: string) {
        let rule: RuleStringConditions = {type: "or", conditions: []}

        for (let fieldTypeRule of this.#fieldTypeRules) {
            let subRule: RuleStringConditions = {type: "and", conditions: []}

            switch (fieldTypeRule[0]) {
                case FieldTypes.STRING:
                    subRule.conditions.push(`${resource}${this.name} is string`);
                    break
                case FieldTypes.NULL:
                    subRule.conditions.push(`${resource}${this.name} == null`);
                    break
                case FieldTypes.INTEGER:
                    subRule.conditions.push(`${resource}${this.name} is int`);
                    break
                case FieldTypes.FLOAT:
                    subRule.conditions.push(`${resource}${this.name} is float`);
                    break
                case FieldTypes.NUMBER:
                    subRule.conditions.push(`${resource}${this.name} is number`);
                    break
                case FieldTypes.BOOLEAN:
                    subRule.conditions.push(`${resource}${this.name} is bool`);
                    break
                case FieldTypes.TIMESTAMP:
                    subRule.conditions.push(`${resource}${this.name} is timestamp`);
                    break
                case FieldTypes.DURATION:
                    subRule.conditions.push(`${resource}${this.name} is duration`);
                    break
                case FieldTypes.LATLNG:
                    subRule.conditions.push(`${resource}${this.name} is latlng`);
                    break
                case FieldTypes.REFERENCE:
                    subRule.conditions.push(`${resource}${this.name} is path`);
                    break
                case FieldTypes.LIST:
                    subRule.conditions.push(`${resource}${this.name} is list`);
                    if (fieldTypeRule[1] instanceof Field) {
                        subRule.conditions.push(`${resource}${this.name}.all(element => ${fieldTypeRule[1]._buildRules("element")})`);
                    }
                    break
                case FieldTypes.MAP:
                    subRule.conditions.push(`${resource}${this.name} is map`);
                    if (fieldTypeRule[1] instanceof FieldMap) {
                        subRule.conditions.push({type: "and", conditions: fieldTypeRule[1]._build(resource + this.name + ".")})
                    }
                    break
                case FieldTypes.ENUM:
            //         Enums are handled by an automatically-created rule. See the enum() method
                    break
            }

            if (fieldTypeRule[1]) {
                if (Array.isArray(fieldTypeRule[1])) subRule.conditions.push(this._transposeCondition(resource, fieldTypeRule[1]))
                else if (fieldTypeRule[1] instanceof FieldMap) {}
                else if (fieldTypeRule[1] instanceof Field) {}
                else subRule.conditions.push(this._transposeRule(resource, fieldTypeRule[1]))
            }

            if (subRule.conditions.length !== 0) {
                rule.conditions.push(subRule)
            }
        }

        console.log(JSON.stringify(rule))
        return rule
    }
}


export class FieldMap<T = Record<string, never>> {
    protected fields: BasicField[] = [];
    readonly name: string

    constructor(name: string) {
        this.name = name
    }

    field<FIELD_TYPE, NAME extends string>(name: NAME, func: (field: Field) => BasicField<FIELD_TYPE>): FieldMap<T & Record<NAME, FIELD_TYPE>> {
        this.fields.push(func(new Field(name)))
        return this
    }

    _build(resourcePath: string) {
        const _resourcePath = `${resourcePath}${this.name}`
        let rules = this.fields.map(field => field._buildRules(_resourcePath))
        return [
            `${resourcePath}keys().hasAll([${this.fields.filter(i => !i.isOptional).map(f => `'${f.name}'`).join(", ")}])`,
            `${resourcePath}keys().hasOnly([${this.fields.map(f => `'${f.name}'`).join(", ")}])`,
            ...rules
        ]
    }
}
