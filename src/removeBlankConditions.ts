export function removeBlankConditions<R>(ruleConditions: R[]): Exclude<R, null | undefined>[] {
    return ruleConditions.filter(i => !!i) as Exclude<R, null | undefined>[]
}
