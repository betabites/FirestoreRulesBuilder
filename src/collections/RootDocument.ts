import {BaseCollection} from "./BaseCollection.js";
import {Collection} from "./Collection.js";
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
        SUBFIELDS extends {},
        SUBCOLLECTIONS extends {},
        RESULT extends Collection<SUBFIELDS, SUBCOLLECTIONS>
    >(
        name: NAME,
        documentIdVar: string | undefined,
        builder: (collection: Collection<{}, {}>) => RESULT
    ):
        RootDocument<COLLECTIONS & Record<NAME, RESULT>> {
        this.#collections.push(builder(new Collection(name, documentIdVar ?? "docId")))
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
