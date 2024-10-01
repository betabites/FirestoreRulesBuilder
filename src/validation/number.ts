import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function number(rule: Rule | RuleCondition | null = null): RequiredValidationFunction<number> {
    const condition: RuleCondition = [{field: "this"}, "is", "number"]
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}