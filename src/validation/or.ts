import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function or<DATA_TYPE>(...validation: RequiredValidationFunction<DATA_TYPE>[]): RequiredValidationFunction<DATA_TYPE> {
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "or",
            conditions: validation.map(i => i(resourcePath, field))
        })
    }
}