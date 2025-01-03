import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function and_DO_NOT_USE<DATA extends readonly RequiredValidationFunction<DATA>[]>(...validation: DATA): RequiredValidationFunction<ExtractInner<DATA[number]>> {
    return (resourcePath, field, currentFieldName) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: validation.map(i => i(resourcePath, field, currentFieldName))
        })
    }
}
type ExtractInner<T> = T extends RequiredValidationFunction<infer U> ? U : never;
