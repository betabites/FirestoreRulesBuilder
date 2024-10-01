import {Rule, RuleCondition, RequiredValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";
import {DocumentReference} from "firebase/firestore";

export function path<DocumentData>(rule: Rule | RuleCondition | null = null): RequiredValidationFunction<DocumentReference<DocumentData>> {
    const condition: RuleCondition = [{field: "this"}, "is", "path"]
    return (resourcePath, field) => {
        return field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })
    }
}