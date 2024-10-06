import {BuildResult} from "../types.js";

export interface BaseCollection<FIELDS extends Record<string, unknown>, COLLECTIONS extends BaseCollection<{}, []>[]> {
    _build(): BuildResult
}
