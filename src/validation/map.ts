import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function map<STRUCTURE extends {[key: string]: RequiredValidationFunction<any>}>(rule: Rule | RuleCondition | null = null, structure: STRUCTURE): RequiredValidationFunction<STRUCTURE> {
    const condition: RuleCondition = [{field: "this"}, "is", "map"]
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}