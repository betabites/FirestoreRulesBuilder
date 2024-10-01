import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function enumValidation<V extends string | number>(rule: Rule | RuleCondition | null = null, values: V[]): RequiredValidationFunction<V> {
    const condition: RuleCondition = [{field: "this"}, "in", JSON.stringify(values)]
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}