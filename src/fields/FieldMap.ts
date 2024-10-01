import {BasicField, Field} from "./Field.js";

export class FieldMap<T> {
    protected fields: BasicField[] = [];
    readonly name: string

    constructor(name: string) {
        this.name = name
    }

    field<NAME extends string, FIELD_TYPE>(name: NAME, func: (field: Field) => BasicField<FIELD_TYPE>): FieldMap<T & { [key in NAME]: FIELD_TYPE }> {
        this.fields.push(func(new Field(name)))
        return this
    }

    _build(resourcePath: string) {
        const _resourcePath = `${resourcePath}${this.name}`
        let rules = this.fields.map(field => field._buildRules(_resourcePath))
        return [
            `${resourcePath}keys().hasAll([${this.fields.filter(i => !i.isOptional).map(f => `'${f.name}'`).join(", ")}])`,
            `${resourcePath}keys().hasOnly([${this.fields.map(f => `'${f.name}'`).join(", ")}])`,
            ...rules
        ]
    }
}