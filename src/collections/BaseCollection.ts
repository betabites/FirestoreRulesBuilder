import {BuildResult} from "../types.js";

export interface BaseCollection<FIELDS extends Record<string, unknown>, COLLECTIONS extends Record<string, BaseCollection<{}, {}>>> {
    _build(): BuildResult
}
