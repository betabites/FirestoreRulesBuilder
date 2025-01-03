import {Rule, Infer} from "../dist/index.js";
import {writeFileSync} from "fs"
import {or} from "../dist/validation/or.js";
import {and} from "../dist/validation/and.js";
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
import {rootDocument} from "../dist/collections/RootDocument.js";
import {collection} from "../dist/collections/Collection.js";

const allowOwnerRule: Rule = {
    type: "and",
    conditions: [["userId", "==", "request.auth.uid"]]
}

/**
 * A re-usable property constructor for database items that could be marked as 'trash'.
 * Items with a date in this property are considered 'trash' and will be permanently deleted when this date is reached.
 *
 *
 */
const trash = optional(or(
    nullable(),
    timestamp()
))

enum StoreTypes {
    BASIC_ONLINE,
    BASIC_PHYSICAL
}

export enum ProductTemplateTypes {
    FIXED,
    MULTI_PAGE
}

let root = rootDocument(undefined, [
    collection("users", "userId", {
        _id: string(),
        colourTheme: number(),
        printCalibrationHeight: number(),
        printCalibrationWidth: number(),
        storage: map(null, {
            available: number(),
            used: number()
        })
    }, [
        collection("artworks", "artworkId", {
            name: string(),
            gpsCoordinates: or(
                nullable(),
                map(null, {
                    latitude: number(),
                    longitude: number()
                })
            ),
            trash: and(trash, map({abc: 123}))
        }, [
            collection("images", "imageId", {
                relativeURI: string(),
                childImages: unsafeList(),
                height: number(),
                tags: unsafeList(),
                width: number(),
                trash
            }, [])
                .allowFullAccessIf(allowOwnerRule)
            ,
            collection("products", "productId", {
                name: string(),
                type: enumValidation(null, ["basic", "group"]),
                printCount: optional(number()),
                productTemplate: optional(path()),
                artworkImage: optional(path()),
                childProducts: unsafeList(),
                userId: string([{field: "this"}, "==", "request.auth.uid"])
            }, [])
                .allowFullAccessIf(allowOwnerRule)
        ])
            .allowFullAccessIf(allowOwnerRule),
        collection("productTemplates", "productTemplateId", {
            cropConstraintEnabled: boolean(),
            cropConstraintX: number(),
            cropConstraintY: number(),
            fitToPage: boolean(),
            includeArtworkImage: boolean(),
            includesSignature: boolean(),
            marginBottom: number(),
            marginLeft: number(),
            marginTop: number(),
            marginRight: number(),
            marginsEnabled: boolean(),
            name: string(),
            type: nativeEnum(null, ProductTemplateTypes),
            multiPageConfig: or(
                nullable(),
                map([{field: "type"}, "==", ProductTemplateTypes.MULTI_PAGE.toString()], {
                    pageCount: number(),
                    pageHeight: number(),
                    pageWidth: number()
                })
            ),
            productionMedium: string()
        }, [])
            .allowFullAccessIf(allowOwnerRule),

        collection("stores", "storeId", {
            name: string(),
            type: nativeEnum(null, StoreTypes)
        }, [
            collection("stockLevels", "stockLevelId", {
                stockLevel: number(),
                inventory: number(),
                product: path(),
                stockLevelAdjustAdd: number(),
                stockLevelAdjustSell: number(),
                userId: string([{field: "this"}, "==", "request.auth.uid"])
            }, [
                collection("history", "historyId", {
                    timestamp: timestamp(),
                    stockLevelChange: number(),
                    stockAfterChange: number()
                }, [])
                    .allowFullAccessIf(allowOwnerRule)
            ])
                .allowFullAccessIf(allowOwnerRule)
        ])
            .allowFullAccessIf(allowOwnerRule)
    ])
        .allowFullAccessIf(allowOwnerRule)
])

writeFileSync("./firestore.rules", root.toString())
export type Root = Infer<typeof root>
let rootData: Root;
// rootData.c.users.c.stores.c.stockLevels.c.history.f.stockAfterChange
let test: typeof rootData.c.users.c.artworks.f = {
    name: "test",
    gpsCoordinates: {
        latitude: 1,
        longitude: 1
    },
    trash: null,
}
