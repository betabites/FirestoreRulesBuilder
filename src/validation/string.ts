import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function string(rule: Rule | RuleCondition | null = null): RequiredValidationFunction<string> {
    const condition: RuleCondition = [{field: "this"}, "is", "string"]
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}