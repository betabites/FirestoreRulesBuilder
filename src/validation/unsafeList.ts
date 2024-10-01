import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function unsafeList(rule: Rule | RuleCondition | null = null): RequiredValidationFunction<unknown[]> {
    const condition: RuleCondition = [{field: "this"}, "is", "list"]
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}