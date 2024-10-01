import {BaseCollection} from "./BaseCollection.js";
import {Collection, ConvertedSchema, Schema} from "./Collection.js";
import {BuildResult, CollectionObjectType} from "../types.js";

export class RootDocument<COLLECTIONS extends Record<string, Collection<never, never>>> implements BaseCollection<Record<string, string>, COLLECTIONS> {
    #collections: Collection<never, never>[] = []
    #database = "{database}"

    constructor(database?: string) {
        if (database) this.#database = database
    }

    get path() {
        return `/databases/${this.#database}/documents`
    }

    collection<
        NAME extends string,
        SCHEMA extends Schema,
        RESULT extends ConvertedSchema<SCHEMA>
    >(
        name: NAME,
        documentIdVar: string | undefined,
        schema: SCHEMA,
        builder: (collection: ConvertedSchema<SCHEMA>) => RESULT
    ):
        RootDocument<COLLECTIONS & Record<NAME, RESULT>>
    {
        let collection = Collection.build(name, documentIdVar ?? "docId", schema)
        this.#collections.push(builder(collection))
        return this
    }

    _build(): BuildResult {
        // Convert the rules to a string

        return [
            "rules_version = '2';",
            "service cloud.firestore {",
            [
                `match /databases/${this.#database}/documents {`,
                ...this.#collections.map(c => c._build()),
                "}"
            ],
            "}"
        ]
    }

    toString() {
        return renderRules(this._build()).join("\n")
    }
}

function renderRules(data: BuildResult, depth = 0) {
    let output: string[] = []
    for (let item of data) {
        if (Array.isArray(item)) for (let _item of renderRules(item, depth + 1)) output.push(_item)
        else output.push(" ".repeat(2 * depth) + item)
    }
    return output
}

export type Infer<ROOT> =
    ROOT extends RootDocument<infer COLLECTIONS> ?
        {
            collections: CollectionObjectType<COLLECTIONS>
            c: CollectionObjectType<COLLECTIONS>
        } : never
