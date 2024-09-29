import {FieldRuleReference, Rule, RuleCondition, RuleStringConditions} from "../types.js";
import {removeBlankConditions} from "../removeBlankConditions.js";

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

export type BasicField = {
    name: string,
    isOptional: boolean,
    _buildRules(resource: string): RuleStringConditions
}

export class Field implements BasicField {
    #editableType: EditableTypes
    #fieldTypeRules = new Map<FieldTypes, Rule | RuleCondition | FieldMap | null>()
    readonly name: string
    isOptional = false

    constructor(name: string, editable?: EditableTypes) {
        this.#editableType = editable ?? "always"
        this.name = name
    }
    optional() { this.isOptional = true; return this }
    nullable(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.NULL, rule); return this }
    string(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.STRING, rule); return this }
    integer(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.INTEGER, rule); return this }
    float(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.FLOAT, rule); return this }
    number(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.NUMBER, rule); return this }
    boolean(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.BOOLEAN, rule); return this }
    timestamp(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.TIMESTAMP, rule); return this }
    duration(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.DURATION, rule); return this }
    geopoint(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.LATLNG, rule); return this }
    path(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.PATH, rule); return this }
    enum(values: (number | string)[], rule: Rule | RuleCondition | null = null) {
        let _rule: Rule = {
            type: "and",
            conditions: [
                [{field: "this"}, "in", JSON.stringify(values)],
                rule
            ]
        }
        this.#fieldTypeRules.set(FieldTypes.ENUM, _rule); return this
    }
    array(rule: Rule | RuleCondition | null = null) { this.#fieldTypeRules.set(FieldTypes.LIST, rule); return this }
    map(builder: (map: FieldMap) => FieldMap) { this.#fieldTypeRules.set(FieldTypes.MAP, builder(new FieldMap(this.name))); return this }

    _transposeRuleResource(resourcePath: string, fieldRuleResource: FieldRuleReference | string) {
        if (typeof fieldRuleResource === "string") return fieldRuleResource
        else if (fieldRuleResource.field === "this") return `${resourcePath}.${this.name}`
        else if (fieldRuleResource.collectionRef) return `get(${fieldRuleResource}).data.${this.name}`
        return `${resourcePath}.${fieldRuleResource.field}`
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
                    subRule.conditions.push(`${resource}.${this.name} is string`);
                    break
                case FieldTypes.NULL:
                    subRule.conditions.push(`${resource}.${this.name} == null`);
                    break
                case FieldTypes.INTEGER:
                    subRule.conditions.push(`${resource}.${this.name} is int`);
                    break
                case FieldTypes.FLOAT:
                    subRule.conditions.push(`${resource}.${this.name} is float`);
                    break
                case FieldTypes.NUMBER:
                    subRule.conditions.push(`${resource}.${this.name} is number`);
                    break
                case FieldTypes.BOOLEAN:
                    subRule.conditions.push(`${resource}.${this.name} is bool`);
                    break
                case FieldTypes.TIMESTAMP:
                    subRule.conditions.push(`${resource}.${this.name} is timestamp`);
                    break
                case FieldTypes.DURATION:
                    subRule.conditions.push(`${resource}.${this.name} is duration`);
                    break
                case FieldTypes.LATLNG:
                    subRule.conditions.push(`${resource}.${this.name} is latlng`);
                    break
                case FieldTypes.REFERENCE:
                    subRule.conditions.push(`${resource}.${this.name} is path`);
                    break
                case FieldTypes.LIST:
                    subRule.conditions.push(`${resource}.${this.name} is list`);
                    break
                case FieldTypes.MAP:
                    subRule.conditions.push(`${resource}.${this.name} is map`);
                    if (fieldTypeRule[1] instanceof FieldMap) {
                        subRule.conditions.push({type: "and", conditions: fieldTypeRule[1]._build(resource)})
                    }
                    break
                case FieldTypes.ENUM:
            //         Enums are handled by an automatically-created rule. See the enum() method
                    break
            }

            if (fieldTypeRule[1]) {
                if (Array.isArray(fieldTypeRule[1])) subRule.conditions.push(this._transposeCondition(resource, fieldTypeRule[1]))
                else if (fieldTypeRule[1] instanceof FieldMap) continue
                else subRule.conditions.push(this._transposeRule(resource, fieldTypeRule[1]))
            }

            if (subRule.conditions.length !== 0) rule.conditions.push(subRule)
        }

        console.log(rule)
        return rule
    }
}


export class FieldMap {
    protected fields: BasicField[] = [];
    readonly name: string

    constructor(name: string) {
        this.name = name
    }

    field(name: string, func: (field: Field) => BasicField) {
        this.fields.push(func(new Field(name)))
        return this
    }

    _build(resourcePath: string) {
        const _resourcePath = `${resourcePath}.${this.name}`
        let rules = this.fields.map(field => field._buildRules(_resourcePath))
        return rules
    }
}
