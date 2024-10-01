import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";
import {enumValidation} from "./enum.js";

export function nativeEnum<V>(rule: Rule | RuleCondition | null = null, values: V): RequiredValidationFunction<V> {
    // @ts-expect-error
    return enumValidation(rule, Object.values(values));
}