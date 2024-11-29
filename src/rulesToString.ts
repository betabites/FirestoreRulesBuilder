import {BuildResult, Rule, RuleStringConditions} from "./types.js";

export function rulesToString(rule: RuleStringConditions): BuildResult {
    let conditions = rule.conditions
        .filter(i => !!i) as (RuleStringConditions | string)[]

    if (conditions.length === 0) throw new Error("Attempted to stringify a rule that has no conditions")
    if (conditions.length === 1) {
        if (typeof conditions[0] === "string") return [conditions[0]]
        return rulesToString(conditions[0])
    }

    const operation = rule.type === "and" ? "&&" : "||"
    return conditions.map((condition, index) => {
        if (typeof condition === "string") return index === 0 ? condition : operation + " " + condition

        let conditionResult = rulesToString(condition)
        if (index === 0) return conditionResult
        else if (conditionResult.length === 1) return index === 0 ? conditionResult[0] : operation + " " + conditionResult[0]
        else return index === 0 ? [
            `(`,
            conditionResult,
            ")"
        ] : [
            `${operation} (`,
            conditionResult,
            ")"
        ]
    })
}
