# Firestore Rules Builder

TypeScript-based tool for building secure Firestore rules

> Note: This package is currently in alpha. Expect some weird quirks and incomplete features.

<!-- TOC -->
* [Firestore Rules Builder](#firestore-rules-builder)
* [Installation](#installation)
* [Overview](#overview)
* [Why Firestore Rules Builder](#why-firestore-rules-builder)
* [What does Firestore Rules Builder do?](#what-does-firestore-rules-builder-do)
* [WARNINGS](#warnings)
* [Defining a schema](#defining-a-schema)
  * [Nested collections](#nested-collections)
  * [Defining additional schema rules](#defining-additional-schema-rules)
* [Defining access rules](#defining-access-rules)
<!-- TOC -->

# Installation

This package can easily be installed via Node Package Manager (NPM):

```shell
npm install --save-dev firestore-rules-builder
```

# Overview

This tool helps in defining structured and secure rules for Firestore databases in TypeScript.

# Why Firestore Rules Builder

A common problem with many Firestore projects is the Firestore rules. Often, the rules are misconfigured, leading to
errors such as unexpected types and problems where users can access and modify other user data.

In a traditional database sense, problems such as these would be solved by a server placed between the client and the
database. The server would mediate what the client has access to and have complete control over data validation.
However, in a Firestore situation, there is no server in between. The client interacts directly with the database. This
means that the database needs to define any data validation and access rules.

This is where Firestore rules come in. Firestore rules determine what, when, and why any given user can access data.
When used properly, this can be extremely powerful. Limiting a given user to accessing only their own data.

However, these rules are often extremely tedious to configure and usually have massive loopholes that cause excessive
problems.

# What does Firestore Rules Builder do?

- **Data Schema Enforcement**:
    - Ensures that your Firestore database enforces data types, preventing type-related issues.
    - Allows definition of the data types for each field, generating rules to ensure compliance.

- **Encourages Secure Practices**:
    - Implements a 'default deny' approach, denying access by default and only granting it when explicitly specified.

- **In-built TypeScript Types**:
    - Facilitates easy access and modification of rules, encouraging secure practices.
    - Integrates with TypeScript to infer document type definitions from your rules/schema, ensuring that type updates
      reflect changes in schema instantly.

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
import {RootDocument} from "firestore-rules-builder";
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
import {RootDocument} from "firestore-rules-builder";
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
import {RootDocument} from "firestore-rules-builder";
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
import {RootDocument} from "firestore-rules-builder";
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

# Converting your schema to typescript types

You can convert your schema into a typescript type using the `Infer<T>` generic type.

```typescript
import {RootDocument, Infer} from "firestore-rules-builder";

const root = new RootDocument()
    .collection("users", undefined, (c) => c
        .field("username", (field) => field.string())
        .collection("data", undefined, (c) => c
            .field("some-data-field", (field) => field.number())
        )
    )

type IRoot = Infer<typeof root>

type IUser = IRoot["collections"]["users"]["fields"]
type IUserData = IRoot["collections"]["users"]["collections"]["data"]["fields"]
```

These type definitions can get quite long. So to aid you, we've created this short-form that you can also use:

```typescript
type IUser = IRoot["c"]["users"]["f"]
type IUserData = IRoot["c"]["users"]["c"]["data"]["f"]
```
