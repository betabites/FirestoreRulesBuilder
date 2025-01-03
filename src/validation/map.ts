import {Rule, RuleCondition, RequiredValidationFunction, RuleStringConditions} from "../types.js";
import {Field} from "../fields/Field.js";
import {collection} from "../collections/Collection.js";
import {RecordHolder} from "../collections/RecordHolder.js";

export function map<STRUCTURE extends {[key: string]: RequiredValidationFunction<any>}>(rule: Rule | RuleCondition | null = null, structure: STRUCTURE): RequiredValidationFunction<STRUCTURE> {
    let condition: RuleCondition = [
        {field: "this"}, "is", "map",
    ]
    return (resourcePath, field, currentFieldName) => {
        let transposedBaseRule = field._transposeRule(resourcePath, {
            type: "and",
            conditions: rule ? [condition, rule] : [condition]
        })

        let mapRecord = new RecordHolder(structure)
        transposedBaseRule.conditions.push(mapRecord._buildSchemaWriteRules(`${resourcePath}${currentFieldName}.`))
        return transposedBaseRule
    }
}
