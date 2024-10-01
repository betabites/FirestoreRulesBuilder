import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function boolean(rule: Rule | RuleCondition | null = null): RequiredValidationFunction<boolean> {
    const condition: RuleCondition = [{field: "this"}, "is", "boolean"]
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}