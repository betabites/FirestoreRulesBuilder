import {BasicField, Field} from "../fields/Field.js";
import {BaseCollection} from "./BaseCollection.js";
import {rulesToString} from "../rulesToString.js";
import {
    BuildResult,
    FieldRuleReference, OptionalValidationFunction,
    Rule,
    RuleCondition,
    RuleStringConditions,
    ValidationFunction
} from "../types.js";
import {FieldMap} from "../fields/FieldMap.js";

export type Schema = {[key: string]: ValidationFunction<any>}
export type ConvertedSchema<SCHEMA> = Collection<{
    [K in keyof SCHEMA]: SCHEMA[K] extends ValidationFunction<infer VALUE> ? VALUE : never
}, {}>

export class Collection<FIELDS extends Record<string, unknown>, COLLECTIONS extends Record<string, Collection<never, never>>> implements BaseCollection<FIELDS, COLLECTIONS> {
    #collections: BaseCollection<never, never>[] = [];
    #allowCreateIf: Rule = {type: "and", conditions: ["false"]}
    #allowUpdateIf: Rule = {type: "and", conditions: ["false"]}
    #allowDeleteIf: Rule = {type: "and", conditions: ["false"]}
    #allowGetIf: Rule = {type: "and", conditions: ["false"]}
    #allowListIf: Rule = {type: "and", conditions: ["false"]}
    #preventAccessBlockingEdits = true;
    validationRuleBuilders: {field: Field, func: ValidationFunction<any>}[] = []
    readonly documentIdVar: string
    readonly name: string

    static build<SCHEMA extends Schema>(name: string, documentIdVar: string, schema: SCHEMA): ConvertedSchema<SCHEMA>
    {
        let collection = new Collection(name, documentIdVar)
        for (let key of Object.keys(schema)) {
            collection._field(key, schema[key]);
        }
        return collection
    }

    constructor(name: string, documentIdVar: string) {
        this.name = name
        this.documentIdVar = documentIdVar
    }

    _field<NAME extends string, VALUE>(name: NAME, func: ValidationFunction<VALUE>): Collection<FIELDS & Record<NAME, VALUE>, COLLECTIONS> {
        let field = new Field(name)
        this.validationRuleBuilders.push({field, func})
        return this
    }

    get relativePath() {
        return `/${this.name}/{${this.documentIdVar}}`
    }

    /*
     * Allows users to edit documents in the current collection in such a way that they lose access
     */
    allowAccessRemovingEdits() {
        this.#preventAccessBlockingEdits = false
    }

    allowFullAccessIf(rule: Rule) {
        this.#allowCreateIf = rule;
        this.#allowUpdateIf = rule;
        this.#allowDeleteIf = rule;
        this.#allowGetIf = rule;
        this.#allowListIf = rule
        return this
    }

    allowGetIf(rule: Rule) {
        this.#allowGetIf = rule;
        return this
    }

    allowCreateIf(rule: Rule) {
        this.#allowCreateIf = rule;
        return this
    }

    allowUpdateIf(rule: Rule) {
        this.#allowUpdateIf = rule;
        return this
    }

    allowDeleteIf(rule: Rule) {
        this.#allowDeleteIf = rule;
        return this
    }

    allowListIf(rule: Rule) {
        this.#allowListIf = rule;
        return this
    }

    collection<
        NAME extends string,
        SCHEMA extends Schema,
        RESULT extends ConvertedSchema<SCHEMA>
    >(
        name: NAME,
        documentIdVar: string,
        schema: SCHEMA,
        builder: (collection: ConvertedSchema<SCHEMA>) => RESULT
    ):
        Collection<FIELDS, COLLECTIONS & Record<NAME, RESULT>>
    {
        let collection = Collection.build(name, documentIdVar, schema)
        this.#collections.push(builder(collection))
        return this
    }

    _transposeRuleField(resourcePath: string, fieldRuleResource: FieldRuleReference | string) {
        if (typeof fieldRuleResource === "string") return fieldRuleResource
        else if (fieldRuleResource.collectionRef) return `get(${fieldRuleResource}).data.${this.name}`
        return `${resourcePath}${fieldRuleResource.field}`
    }

    _transposeCondition(resourcePath: string, condition: RuleCondition) {
        return `${this._transposeRuleField(resourcePath, condition[0])} ${condition[1]} ${this._transposeRuleField(resourcePath, condition[2])}`

    }

    _transposeRule(resourcePath: string, rule: Rule): RuleStringConditions {
        let _rule: RuleStringConditions = {type: rule.type, conditions: []}
        _rule.conditions = rule.conditions
            .filter(i => !!i)
            .map(condition => {
                if (typeof condition === "string") return condition
                else if (Array.isArray(condition)) {
                    return this._transposeCondition(resourcePath, condition)
                }
                else if (!condition) throw new Error("Null/Undefined condition!")
                return this._transposeRule(resourcePath, condition)
            })

        return _rule

    }

    _buildSchemaWriteRules(resource: string): RuleStringConditions {
        let rules = this.validationRuleBuilders
            .map(validation =>
                isOptional(validation.func)
                    ? validation.func.func(resource, validation.field)
                    : validation.func(resource, validation.field)
            )
            .filter(rule => rule.conditions.length !== 0)
            .flat(1)
        rules.unshift({
            type: "and",
            conditions: [
                `${resource}keys().hasAll([${this.validationRuleBuilders.filter(i => !isOptional(i.func)).map(f => `'${f.field.name}'`).join(", ")}])`,
                `${resource}keys().hasOnly([${this.validationRuleBuilders.map(f => `'${f.field.name}'`).join(", ")}])`
            ]
        })
        return {type: "and", conditions: rules}
    }

    _build(): BuildResult {

        // Convert the rules to a string
        return [
            `match ${this.relativePath} {`,
            [
                "function isValidSchema(data) {",
                ["return " + rulesToString(this._buildSchemaWriteRules("data.")) + ";"],
                "}",
                `allow get: if ${rulesToString(this._transposeRule("resource.data.", this.#allowGetIf))};`,
                `allow create: if ${rulesToString({
                    type: "and",
                    conditions: [
                        rulesToString(this._transposeRule("request.resource.data.", this.#allowCreateIf)),
                        "isValidSchema(request.resource.data)"
                    ]
                })};`,
                `allow update: if ${rulesToString({
                    type: "and",
                    conditions: [
                        "isValidSchema(request.resource.data)",
                        this._transposeRule("resource.data", this.#allowUpdateIf),
                        this.#preventAccessBlockingEdits ? this._transposeRule("request.resource.data.", this.#allowUpdateIf) : undefined
                    ]
                })};`,
                `allow list: if ${rulesToString(this._transposeRule("request.resource.data.", this.#allowListIf))};`,
                `allow delete: if ${rulesToString(this._transposeRule("request.resource.data.", this.#allowDeleteIf))};`,
                ...this.#collections.map(c => c._build()).flat(1)
            ],
            "}"
        ]
    }
}

function isOptional<DATA>(validation: ValidationFunction<DATA>): validation is OptionalValidationFunction<DATA> {
    // @ts-expect-error
    return validation.func.isOptional
}