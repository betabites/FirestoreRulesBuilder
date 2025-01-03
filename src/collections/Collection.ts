import {BasicField, Field} from "../fields/Field.js";
import {BaseCollection} from "./BaseCollection.js";
import {rulesToString} from "../rulesToString.js";
import {
    BuildResult, CollectionArray,
    FieldRuleReference, OptionalValidationFunction,
    Rule,
    RuleCondition,
    RuleStringConditions,
    ValidationFunction
} from "../types.js";
import {FieldMap} from "../fields/FieldMap.js";
import {RecordHolder} from "./RecordHolder.js";


export class Collection<
    NAME extends string,
    FIELDS extends Record<string, ValidationFunction<any>>,
    COLLECTIONS extends CollectionArray>
    extends RecordHolder
    implements BaseCollection<FIELDS, COLLECTIONS>
{
    #allowCreateIf: Rule = {type: "and", conditions: ["false"]}
    #allowUpdateIf: Rule = {type: "and", conditions: ["false"]}
    #allowDeleteIf: Rule = {type: "and", conditions: ["false"]}
    #allowGetIf: Rule = {type: "and", conditions: ["false"]}
    #allowListIf: Rule = {type: "and", conditions: ["false"]}
    _allowCollectionGroupListIf: Rule | null = null
    #preventAccessBlockingEdits = true;
    readonly documentIdVar: string

    constructor(
        readonly name: NAME,
        documentIdVar: string,
        readonly fields: FIELDS,
        readonly collections: COLLECTIONS
    ) {
        super(fields)
        this.name = name
        this.documentIdVar = documentIdVar
        this.collections = collections
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

    /**
     * Specifies a rule that allows users to search for documents in a collection group.
     * @warning CANNOT access document ID variables, or the actual contents of each document that will be listed
     * To limit which documents can be listed, add an allow-all rule here, and configure `allowGetIf`.
     */
    allowCollectionGroupListIf(rule: Rule) {
        this._allowCollectionGroupListIf = rule
        return this
    }

    _transposeRuleField(resourcePath: string, fieldRuleResource: FieldRuleReference | string) {
        if (typeof fieldRuleResource === "string") return fieldRuleResource
        else if (fieldRuleResource.collectionRef) return `get(${fieldRuleResource.collectionRef}).data.${fieldRuleResource.field}`
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

    _getCollectionGroups(): Collection<any, any, any>[] {
        let results = this.collections.map(collection => collection._getCollectionGroups()).flat(1)
        if (this._allowCollectionGroupListIf) results.push(this)
        return results
    }

    #buildRules() {
        return [
            "function isValidSchema(data) {",
            [
                "return (",
                rulesToString(this._buildSchemaWriteRules("data.")),
                ");"],
            "}",
            `allow get: if ${rulesToString(this._transposeRule("resource.data.", this.#allowGetIf))};`,
            `allow create: if (`,
            rulesToString({
                type: "and",
                conditions: [
                    this._transposeRule("request.resource.data.", this.#allowCreateIf),
                    "isValidSchema(request.resource.data)"
                ]
            }),
            ");",
            `allow update: if (`,
            rulesToString({
                type: "and",
                conditions: [
                    "isValidSchema(request.resource.data)",
                    this._transposeRule("resource.data", this.#allowUpdateIf),
                    this.#preventAccessBlockingEdits ? this._transposeRule("request.resource.data.", this.#allowUpdateIf) : undefined
                ]
            }),
            ");",
            `allow list: if (`,
            rulesToString(this._transposeRule("request.resource.data.", this.#allowListIf)),
            ");",
            `allow delete: if (`,
            rulesToString(this._transposeRule("request.resource.data.", this.#allowDeleteIf)),
            ");",
        ]
    }

    _build(): BuildResult {

        // Convert the rules to a string
        return [
            `match ${this.relativePath} {`,
            [
                ...this.#buildRules(),
                ...this.collections.map(c => c._build()).flat(1)
            ],
            "}"
        ]
    }

    _buildCollectionGroup() {
        // Convert the rules to a string
        return [
            `match /{path=**}/${this.name}/{${this.documentIdVar}} {`,
            [
                `allow list: if (`,
                rulesToString(this._transposeRule("request.resource.data.", this._allowCollectionGroupListIf ?? {type: "and", conditions: ["true"]})),
                ");"
            ],
            "}"
        ]
    }
}

export function collection<
    NAME extends string,
    FIELDS extends Record<string, ValidationFunction<unknown>>,
    COLLECTIONS extends CollectionArray
> (name: NAME, documentIdVar: string | undefined, fields: FIELDS, collections: COLLECTIONS) {
    return new Collection(name, documentIdVar ?? "docId", fields, collections)

}
