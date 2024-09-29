import {BaseCollection} from "./BaseCollection.js";
import {Collection} from "./Collection.js";
import {BuildResult} from "../types.js";

export class RootDocument implements BaseCollection {
    #collections: Collection[] = []
    #database = "{database}"

    constructor(database?: string) {
        if (database) this.#database = database
    }

    get path() {
        return `/databases/${this.#database}/documents`
    }

    collection(name: string, documentIdVar: string, builder: (collection: Collection) => Collection) {
        this.#collections.push(builder(new Collection(this, name, documentIdVar)))
        return this
    }

    _build(): BuildResult {
        // Convert the rules to a string

        return [
            "rules_version = '2';",
            "service cloud.firestore {",
            [
                `match /database/${this.#database}/documents {`,
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
        else output.push(" ".repeat(4 * depth) + item)
    }
    return output
}
