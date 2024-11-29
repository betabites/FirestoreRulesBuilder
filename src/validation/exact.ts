import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function exact<T extends string | number>(value: T, rule: Rule | RuleCondition | null = null): RequiredValidationFunction<T> {
    const condition: RuleCondition = [{field: "this"}, "==", JSON.stringify(value)]
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}

