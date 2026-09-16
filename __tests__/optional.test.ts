import assert from "node:assert/strict";
import test from "node:test";

import {
    collection,
    map,
    nullable,
    number,
    optional,
    or,
    rootDocument,
    string,
    type RequiredValidationFunction,
} from "../dist/index.js";

function buildRules(validation: RequiredValidationFunction<unknown>): string {
    return rootDocument(undefined, [
        collection("products", "productId", {
            name: string(),
            details: optional(validation),
        }, []),
    ]).toString();
}

test("optional nested maps retain their field name", () => {
    const rules = buildRules(map(null, {version: number()}));

    assert.match(rules, /data\.details\.keys\(\)\.hasAll\(\['version'\]\)/);
    assert.match(rules, /data\.details\.version is number/);
    assert.doesNotMatch(rules, /data\.undefined/);
});

test("optional nested maps retain their field name through combinators", () => {
    const rules = buildRules(or(nullable(), map(null, {version: number()})));

    assert.match(rules, /data\.details\.version is number/);
    assert.doesNotMatch(rules, /data\.undefined/);
});

test("optional scalar fields remain optional", () => {
    const rules = buildRules(number());

    assert.match(rules, /!\(\s*"details" in data\s*\)/);
    assert.match(rules, /data\.details is number/);
});
