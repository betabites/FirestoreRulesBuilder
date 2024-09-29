import {BuildResult} from "../types.js";

export interface BaseCollection {
    _build(): BuildResult
}
