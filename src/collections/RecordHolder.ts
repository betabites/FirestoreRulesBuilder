import {OptionalValidationFunction, RuleStringConditions, ValidationFunction} from "../types.js";
import {Field} from "../fields/Field.js";

export class RecordHolder {
    constructor(readonly fields: Record<string, ValidationFunction<any>>) {}

    _buildSchemaWriteRules(resource: string): RuleStringConditions {
        let rules = Object.keys(this.fields)
            .map(fieldName => {
                let field = new Field(fieldName)
                let func = this.fields[fieldName];
                return isOptional(func)
                    ? func.func(resource, field, fieldName)
                    : func(resource, field, fieldName)
            })
            .filter(rule => rule.conditions.length !== 0)
            .flat(1)
        rules.unshift({
            type: "and",
            conditions: [
                `${resource}keys().hasAll([${Object.keys(this.fields).filter(fieldName => !isOptional(this.fields[fieldName])).map(f => `'${f}'`).join(", ")}])`,
                `${resource}keys().hasOnly([${Object.keys(this.fields).map(f => `'${f}'`).join(", ")}])`
            ]
        })
        return {type: "and", conditions: rules}
    }

}

function isOptional<DATA>(validation: ValidationFunction<DATA>): validation is OptionalValidationFunction<DATA> {
    // @ts-expect-error
    return validation.isOptional
}
