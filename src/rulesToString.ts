import {Rule, RuleStringConditions} from "./types.js";

export function rulesToString(rule: RuleStringConditions): string {
    let conditions = rule.conditions
        .filter(i => !!i) as (RuleStringConditions | string)[]

    if (conditions.length === 0) throw new Error("Attempted to stringify a rule that has no conditions")
    if (conditions.length === 1) {
        if (typeof conditions[0] === "string") return conditions[0]
        return rulesToString(conditions[0])
    }

    return "(" + conditions.map(condition => {
        if (typeof condition === "string") return condition
        return `${rulesToString(condition)}`
    }).join(rule.type === "and" ? " && " : " || ") + ")"
}
