npx yaml2json rulesetSchema.yaml | Out-File -FilePath schema.json -Encoding Utf8
npx ajv compile -s schema.json

npx yaml2json ruleset.yaml | Out-File -FilePath ruleset.json -Encoding Utf8
npx ajv test -s schema.json -d ruleset.json --invalid
