import {OptionalValidationFunction, Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function optional<DATA_TYPE>(validation: RequiredValidationFunction<DATA_TYPE>): OptionalValidationFunction<DATA_TYPE | undefined | never> {
    const condition: RuleCondition = [{field: "this"}, "==", "null"]
    return {
        isOptional: true,
        func(resourcePath, field, currentFieldName) {
            return field._transposeRule(resourcePath, {
                type: "or",
                conditions: [
                    {
                        type: "not",
                        conditions: [[JSON.stringify(currentFieldName), "in", resourcePath.substring(0, resourcePath.length - 1)]]
                    },
                    validation(resourcePath, field)
                ]
            })
        },
    }
}
