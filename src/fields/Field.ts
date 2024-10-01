import {FieldRuleReference, Rule, RuleCondition, RuleStringConditions} from "../types.js";
import {removeBlankConditions} from "../removeBlankConditions.js";
import {type DocumentReference} from "firebase/firestore";
import {FieldMap} from "./FieldMap.js";

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

type Append<OLD_TYPES, NEW_TYPE> = Field<OLD_TYPES | NEW_TYPE>

export class Field<T = never> implements BasicField<T> {
    #editableType: EditableTypes
    #fieldTypeRules = new Map<FieldTypes, Rule | RuleCondition | FieldMap<unknown> | null>()
    readonly name: string
    isOptional = false
    rules: Rule[] = []

    constructor(name: string, editable?: EditableTypes) {
        this.#editableType = editable ?? "always"
        this.name = name
    }

    optional(): Append<this, undefined> {
        this.isOptional = true;
        return this
    }

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
                    break
                case FieldTypes.MAP:
                    subRule.conditions.push(`${resource}${this.name} is map`);
                    if (fieldTypeRule[1] instanceof FieldMap) {
                        subRule.conditions.push({
                            type: "and",
                            conditions: fieldTypeRule[1]._build(resource + this.name + ".")
                        })
                    }
                    break
                case FieldTypes.ENUM:
                    //         Enums are handled by an automatically-created rule. See the enum() method
                    break
            }

            if (fieldTypeRule[1]) {
                if (Array.isArray(fieldTypeRule[1])) subRule.conditions.push(this._transposeCondition(resource, fieldTypeRule[1]))
                else if (fieldTypeRule[1] instanceof FieldMap) {
                }
                else if (fieldTypeRule[1] instanceof Field) {
                }
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


