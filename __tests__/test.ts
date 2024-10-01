import {RootDocument, Rule, Infer} from "../dist/index.js";
import {writeFileSync} from "fs"
import {or} from "../dist/validation/or.js";
import {nullable} from "../dist/validation/nullable.js";
import {map} from "../dist/validation/map.js";
import {number} from "../dist/validation/number.js";
import {string} from "../dist/validation/string.js";
import {unsafeList} from "../dist/validation/unsafeList.js";
import {enumValidation} from "../dist/validation/enum.js";
import {path} from "../dist/validation/path.js";
import {boolean} from "../dist/validation/boolean.js";
import {nativeEnum} from "../dist/validation/nativeEnum.js";
import {timestamp} from "../dist/validation/timestamp.js";
import {optional} from "../dist/validation/optional.js";

const allowOwnerRule: Rule = {
    type: "and",
    conditions: [["userId", "==", "request.auth.uid"]]
}

enum StoreTypes {
    BASIC_ONLINE,
    BASIC_PHYSICAL
}

let root = new RootDocument()
    .collection("users", "userId",
        {
            _id: string(),
            colourTheme: number(),
            printCalibrationHeight: number(),
            printCalibrationWidth: number(),
            storage: map(null, {
                available: number(),
                used: number()
            })
        },
        (c) => c
            .allowFullAccessIf(allowOwnerRule)
            .collection("artworks", "artworkId", {
                    name: string(),
                    gpsCoordinates: or(
                        nullable(),
                        map(null, {latitude: number(), longitude: number()})
                    )
                }, (c) => c
                    .allowFullAccessIf(allowOwnerRule)
                    .collection(
                        "images", "imageId",
                        {
                            childImages: unsafeList(),
                            height: number(),
                            tags: unsafeList(),
                            width: number()
                        },
                        (c) => c
                            .collection("products", "productId", {
                                    name: string(),
                                    type: enumValidation(null, ["basic, group"]),
                                    printCount: optional(number()),
                                    productTemplate: optional(path()),
                                    artworkImage: optional(path()),
                                    childProducts: unsafeList(),
                                    userId: string([{field: "this"}, "==", "request.auth.uid"])
                                }, (c) => c
                                    .allowFullAccessIf(allowOwnerRule)
                            )
                    )
                    .collection("productTemplates", "productTemplateId", (c) => c
                        .allowFullAccessIf(allowOwnerRule)
                        .field("cropConstraintEnabled", boolean())
                        .field("cropConstraintX", number())
                        .field("cropConstraintY", number())
                        .field("fitToPage", boolean())
                        .field("includeArtworkImage", boolean())
                        .field("includeSignature", boolean())
                        .field("marginBottom", number())
                        .field("marginLeft", number())
                        .field("marginRight", number())
                        .field("marginTop", number())
                        .field("marginsEnabled", boolean())
                        .field("name", string())
                        .field("productMedium", string())
                    )
                    .collection("stores", "storeId", (c) => c
                        .allowFullAccessIf(allowOwnerRule)
                        .field("name", string())
                        .field("type", nativeEnum(null, StoreTypes))
                        .collection("stockLevels", "stockLevelId", c => c
                            .allowFullAccessIf(allowOwnerRule)
                            .field("inventory", number())
                            .field("product", path())
                            .field("stockLevelAdjustAdd", number())
                            .field("stockLevelAdjustSell", number())
                            .field("userId", string([{field: "this"}, "==", "request.auth.uid"]))
                            .collection("history", "historyId", (c) => c
                                .field("timestamp", timestamp())
                                .field("stockLevelChange", number())
                                .field("stockAfterChange", number())
                            )
                        )
                    )
            );

writeFileSync("./firestore.rules", root.toString())
export type Root = Infer<typeof root>
let rootData: Root;