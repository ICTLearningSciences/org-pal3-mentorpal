module.exports = {
    "env": {
        "amd": true,
        "browser": true,
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "@typescript-eslint/tslint"
    ],
    "rules": {
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "@typescript-eslint/array-type": "error",
        "@typescript-eslint/ban-types": "error",
        "@typescript-eslint/class-name-casing": "error",
        "@typescript-eslint/explicit-member-accessibility": [
            "error",
            {
                "overrides": {
                    "constructors": "off"
                }
            }
        ],
        "@typescript-eslint/indent": "off",
        "@typescript-eslint/interface-name-prefix": "error",
        "@typescript-eslint/member-delimiter-style": "off",
        "@typescript-eslint/member-ordering": "error",
        "@typescript-eslint/no-angle-bracket-type-assertion": "error",
        "@typescript-eslint/no-empty-interface": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-misused-new": "error",
        "@typescript-eslint/no-namespace": "error",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-triple-slash-reference": "error",
        "@typescript-eslint/no-use-before-declare": "off",
        "@typescript-eslint/no-var-requires": "error",
        "@typescript-eslint/prefer-for-of": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/prefer-interface": "error",
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "@typescript-eslint/type-annotation-spacing": "off",
        "@typescript-eslint/unified-signatures": "error",
        "arrow-body-style": "error",
        "arrow-parens": [
            "off",
            "as-needed"
        ],
        "complexity": "off",
        "constructor-super": "error",
        "curly": "error",
        "dot-notation": "error",
        "eol-last": "off",
        "guard-for-in": "error",
        "linebreak-style": "off",
        "max-classes-per-file": [
            "error",
            1
        ],
        "new-parens": "off",
        "newline-per-chained-call": "off",
        "no-bitwise": "error",
        "no-caller": "error",
        "no-cond-assign": "error",
        "no-console": "error",
        "no-debugger": "error",
        "no-empty": "error",
        "no-empty-functions": "error",
        "no-eval": "error",
        "no-extra-semi": "off",
        "no-fallthrough": "off",
        "no-invalid-this": "off",
        "no-irregular-whitespace": "off",
        "no-multiple-empty-lines": "off",
        "no-new-wrappers": "error",
        "no-throw-literal": "error",
        "no-undef-init": "error",
        "no-unsafe-finally": "error",
        "no-unused-labels": "error",
        "no-var": "error",
        "object-shorthand": "error",
        "one-var": "error",
        "prefer-const": "error",
        "quote-props": "off",
        "radix": "error",
        "space-before-function-paren": "off",
        "use-isnan": "error",
        "valid-typeof": "off",
        "@typescript-eslint/tslint/config": [
            "error",
            {
                "rules": {
                    "comment-format": [
                        true,
                        "check-space"
                    ],
                    "jsdoc-format": true,
                    "no-reference-import": true,
                    "no-shadowed-variable": true,
                    "no-unused-expression": true,
                    "object-literal-sort-keys": true,
                    "only-arrow-functions": [
                        true,
                        "allow-declarations",
                        "allow-named-functions"
                    ],
                    "ordered-imports": [
                        true,
                        {
                            "import-sources-order": "case-insensitive",
                            "module-source-path": "full",
                            "named-imports-order": "case-insensitive"
                        }
                    ],
                    "triple-equals": [
                        true,
                        "allow-null-check"
                    ],
                    "variable-name": [
                        true,
                        "ban-keywords",
                        "check-format",
                        "allow-pascal-case"
                    ]
                }
            }
        ]
    }
};
