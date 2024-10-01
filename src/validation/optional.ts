import {OptionalValidationFunction, Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export function optional<DATA_TYPE>(validation: RequiredValidationFunction<DATA_TYPE>): OptionalValidationFunction<DATA_TYPE> {
    const condition: RuleCondition = [{field: "this"}, "==", "null"]
    return {
        isOptional: true,
        func: validation,
    }
}