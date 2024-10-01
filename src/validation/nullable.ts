import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function nullable(rule: Rule | RuleCondition | null = null): RequiredValidationFunction<null> {
    const condition: RuleCondition = [{field: "this"}, "==", "null"]
    return (resourcePath, field: Field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}