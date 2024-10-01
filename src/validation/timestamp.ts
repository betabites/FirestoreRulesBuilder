import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function timestamp(rule: Rule | RuleCondition | null = null): RequiredValidationFunction<Date> {
    const condition: RuleCondition = [{field: "this"}, "is", "timestamp"]
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}