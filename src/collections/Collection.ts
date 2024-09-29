import {BasicField, Field, FieldMap} from "../fields/Field.js";
import {BaseCollection} from "./BaseCollection.js";
import {rulesToString} from "../rulesToString.js";
import {BuildResult, FieldRuleReference, Rule, RuleCondition, RuleStringConditions} from "../types.js";

export class Collection implements BaseCollection {
    #collections: BaseCollection[] = [];
    #parent: BaseCollection
    #allowCreateIf: Rule = {type: "and", conditions: ["false"]}
    #allowUpdateIf: Rule = {type: "and", conditions: ["false"]}
    #allowReadIf: Rule = {type: "and", conditions: ["false"]}
    #allowListIf: Rule = {type: "and", conditions: ["false"]}
    #allowDeleteIf: Rule = {type: "and", conditions: ["false"]}
    #preventAccessBlockingEdits = true;
    readonly documentIdVar: string
    readonly name: string

    protected fields: BasicField[] = [];

    constructor(parent: BaseCollection, name: string, documentIdVar: string) {
        this.name = name
        this.#parent = parent
        this.documentIdVar = documentIdVar
    }

    field(name: string, func: (field: Field) => BasicField) {
        this.fields.push(func(new Field(name)))
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

    allowFullAccessIf(rule: Rule): Omit<this, "allowFullAccessIf" | "allowCreateIf" | "allowUpdateIf" | "allowDeleteIf" | "allowListIf"> {
        this.#allowCreateIf = rule;
        this.#allowUpdateIf = rule;
        this.#allowDeleteIf = rule;
        this.#allowReadIf = rule;
        this.#allowListIf = rule
        return this
    }

    allowReadIf(rule: Rule): Omit<this, "allowReadIf"> {
        this.#allowReadIf = rule;
        return this
    }

    allowCreateIf(rule: Rule): Omit<this, "allowCreateIf"> {
        this.#allowCreateIf = rule;
        return this
    }

    allowUpdateIf(rule: Rule): Omit<this, "allowUpdateIf"> {
        this.#allowUpdateIf = rule;
        return this
    }

    allowDeleteIf(rule: Rule): Omit<this, "allowDeleteIf"> {
        this.#allowDeleteIf = rule;
        return this
    }

    allowListIf(rule: Rule): Omit<this, "allowListIf"> {
        this.#allowListIf = rule;
        return this
    }

    collection(name: string, documentIdVar: string, builder: (collection: Collection) => BaseCollection) {
        this.#collections.push(builder(new Collection(this, name, documentIdVar)))
        return this
    }

    _transposeRuleField(resourcePath: string, fieldRuleResource: FieldRuleReference | string) {
        if (typeof fieldRuleResource === "string") return fieldRuleResource
        else if (fieldRuleResource.collectionRef) return `get(${fieldRuleResource}).data.${this.name}`
        return `${resourcePath}.${fieldRuleResource.field}`
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

        console.log(_rule)
        return _rule

    }

    _buildSchemaWriteRules(resource: string): RuleStringConditions {
        let rules = this.fields
            .map(field => field._buildRules(resource))
            .filter(rule => rule.conditions.length !== 0)
            .flat(1)
        rules.unshift({
            type: "and",
            conditions: [
                `${resource}.keys().hasAll([${this.fields.filter(i => !i.isOptional).map(f => `'${f.name}'`).join(", ")}])`,
                `${resource}.keys().hasOnly([${this.fields.map(f => `'${f.name}'`).join(", ")}])`
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
                ["return " + rulesToString(this._buildSchemaWriteRules("data"))] + ";",
                "}",
                `allow read: if ${rulesToString(this._transposeRule("resource.data", this.#allowReadIf))};`,
                `allow create: if ${rulesToString({
                    type: "and",
                    conditions: [
                        rulesToString(this._transposeRule("request.resource.data", this.#allowCreateIf)),
                        "isValidSchema(request.resource)"
                    ]
                })};`,
                `allow update: if ${rulesToString({
                    type: "and",
                    conditions: [
                        "isValidSchema(request.resource)",
                        this._transposeRule("resource.data", this.#allowUpdateIf),
                        this.#preventAccessBlockingEdits ? this._transposeRule("request.resource.data", this.#allowUpdateIf) : undefined
                    ]
                })};`,
                `allow list: if ${rulesToString(this._transposeRule("request.resource.data", this.#allowListIf))};`,
                `allow delete: if ${rulesToString(this._transposeRule("request.resource.data", this.#allowDeleteIf))};`,
                ...this.#collections.map(c => c._build()).flat(1)
            ],
            "}"
        ]
    }
}
