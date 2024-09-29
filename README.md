# Firestore Rules Builder

TypeScript-based tool for building secure Firestore rules

<!-- TOC -->

* [Firestore Rules Builder](#firestore-rules-builder)
* [Installation](#installation)
    * [Why Firestore Rules Builder](#why-firestore-rules-builder)
    * [What does Firestore Rules Builder do?](#what-does-firestore-rules-builder-do)
* [WARNINGS](#warnings)
* [Defining a schema](#defining-a-schema)
    * [Defining additional schema rules](#defining-additional-schema-rules)
* [Defining access rules](#defining-access-rules)

<!-- TOC -->

# Installation

This package can easily be installed via Node Package Manager (NPM):

```shell
npm install --save-dev firestore-rules-builder
```

## Why Firestore Rules Builder

A common problem with many Firestore projects is the Firestore rules. Often, the rules are misconfigured, leading to errors such as unexpected types and problems where users can access and modify other user data.

In a traditional database sense, problems such as these would be solved by a server placed between the client and the database. The server would mediate what the client has access to and have complete control over data validation. However, in a Firestore situation, there is no server in between. The client interacts directly with the database. This means that the database needs to define any data validation and access rules.

This is where Firestore rules come in. Firestore rules determine what, when, and why any given user can access data.
When used properly, this can be extremely powerful. Limiting a given user to accessing only their own data.

However, these rules are often extremely tedious to configure and usually have massive loopholes that cause excessive problems.

## What does Firestore Rules Builder do?

- Build rules that enforce a data schema
    - A common problem with Firestore databases is that the actual type of data isn't enforced. This means that while
      your program might *expect* a number, it *could* get a string instead.
    - Firestore Rules Builder allows you to define the data types of each of your fields, and will build rules that
      ensure these data types are met.
- Encourage secure practices
    - Firestore Rules Builder encourages the idea of 'default deny'. Firestore
      Rules Builder will always deny access to a given resource to everyone, unless you specify in your rules who should
      have it.
- In-built typescript types
    - We want to make it as easy as possible to access and modify your rules. We believe that doing this encourages you
      to make more secure choices, as it is less tedious to change your rules.
    - One of the ways we do this is by integrating with TypeScript. Document type definitions can be inferred from your
      rules/schema! This means that the instant you change your schema, your types also update!

# WARNINGS

A few warnings before using this building tool:

- Schema errors will appear as unauthorised errors on your client. Unfortunately there isn't any way around this, as far
  as we're aware.
- Firestore Rules Builder is a tool for good security, but it is not a substitute. Make sure you never grant more
  permissions than needed.
- This tool cannot enforce schema, or anything, on a client using the firebase-admin SDK/API.
    - Firestore rules do not apply to requests coming from these.

# Defining a schema

Schemas are defined through the `RootDocument` object. You can define a schema as shown below:

```typescript
import {RootDocument} from "./RootDocument.js";
import {writeFileSync} from "fs";

// 'Root Document' refers to the root level of your database
const root = new RootDocument()
    .collection("my-collection", undefined, (c) => c
        .field("my-string-field", (field) => field.string())
        .field("my-number-field", (field) => field.number())
        .field("my-timestamp-field", (field) => field.timestamp())
    )
writeFileSync("firestore.rules", root.toString())
```

## Nested collections

Collections nested within each other can be defined as such:

```typescript
import {RootDocument} from "./RootDocument.js";
import {writeFileSync} from "fs";

// 'Root Document' refers to the root level of your database
const root = new RootDocument()
    .collection("my-collection", undefined, (c) => c
        .field("my-string-field", (field) => field.string())
        .collection("my-nested-collection", undefined, (c) => c
                .field(/* ... */)
            /* ... */
        )
    )
writeFileSync("firestore.rules", root.toString())
```

## Defining additional schema rules

Sometimes you don't just want a field to be a number, you want it to be a number less than 5. Schema rules allow you to
enforce this.

Data will only be accepted if all schema rules pass

> Schema rules are applied whenever a user attempts to make a modification data.

```typescript
const root = new RootDocument()
    .collection("users", undefined, (c) => c
        // Create a string field called 'userId'
        .field("userId", (field) => field.string(
            // Enforce that it must match the ID of the current user
            [{field: "this"}, "==", "request.auth.uid"])
        )
    )
writeFileSync("firestore.rules", root.toString())
```

# Defining access rules

> **IMPORTANT:** Firestore Rule Builder does not allow creation of rules for the generic operations `read` and `write`.
> You'll
> instead need to split these into `create`, `update`, `delete`, `get`, and `list` respectively.

Defining access rules is an important part of security. The code below shows an example where a user can only access a
document if the `userId` field within the document matches their ID.

```typescript
import {RootDocument} from "./RootDocument.js";
import {writeFileSync} from "fs";

// 'Root Document' refers to the root level of your database
const root = new RootDocument()
    .collection("users", undefined, (c) => c
        .allowGetIf({
            type: "and",
            conditions: [
                [{field: "userId"}, "==", "request.auth.uid"]
            ]
        })
    )
writeFileSync("firestore.rules", root.toString())
```

Rules can be written in multiple ways. See the example below for all the different ways you can write rules.

```typescript
import {RootDocument} from "./RootDocument.js";
import {writeFileSync} from "fs";

// 'Root Document' refers to the root level of your database
const root = new RootDocument()
    .collection("users", "userDocId", (c) => c
        .collection("data", undefined, (c) => c
            .allowGetIf({
                type: "and",
                conditions: [
                    // Rules that reference fields in the current document
                    [{field: "userId"}, "==", "request.auth.uid"],
                    ["request.auth.uid", "==", {field: "userId"}],

                    // A rule that references another document
                    [
                        {resourcePath: "/databases/$(database)/documents/users/$(userId)", field: "subscription"},
                        "==", "0"
                    ],

                    // Manually written rules
                    ["resource.data.userId", "==", "request.auth.uid"],
                    "request.data.userId == request.auth.uid"
                ]
            })
        )
    )
writeFileSync("firestore.rules", root.toString())
```
