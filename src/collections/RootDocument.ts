import {BaseCollection} from "./BaseCollection.js";
import {Collection} from "./Collection.js";
import {BuildResult, CollectionObjectType} from "../types.js";

export class RootDocument<COLLECTIONS extends Collection<"database", {}, []>[]> {
    #collections: COLLECTIONS
    #database = "{database}"

    constructor(database: string | undefined, collections: COLLECTIONS) {
        if (database) this.#database = database
        this.#collections = collections
    }

    get path() {
        return `/databases/${this.#database}/documents`
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

export function rootDocument(database: string | undefined, collections: Collection<string, {}, []>[]) {
    return new RootDocument(database, collections);
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
