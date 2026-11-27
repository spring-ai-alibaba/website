# Spring AI Alibaba Documentation Website

The official documentation website for the Spring AI Alibaba project, built with Docusaurus.

## Quick Start

Ensure npm is installed locally. Then run `make install && make preview`.

## Documentation versions

The default `2.1.x` docs are maintained in `docs`, `agents-docs`, `integration`, and `ecosystem`. The `1.x` and `2.0.x` documents and sidebars are saved under the corresponding `*_versioned_docs` and `*_versioned_sidebars` directories. Framework docs use `versioned_docs` and `versioned_sidebars`.

Change the source for the release line that provides the API shown on the page. Use relative links within a documentation section and include the archived version in cross-section links. The latest version keeps the unversioned routes. English translations live under `i18n/en` and otherwise fall back to the default language.

## Starting in Chinese or English

Default (Chinese): `make preview`
English: `make preview-en`

## Build and Serve

`make build && make serve`

## Before Committing

Before committing, run `make npm-lint && make markdown` to ensure the GitHub CI passes successfully.
(PS: You may need to install CI tools. Run `make help` to view fix commands and install formatting tools.)

## Useful Tips

1. Docusaurus Markdown features - use them appropriately to make documentation structure better and more readable: https://docusaurus.io/docs/markdown-features/react
2. `make pangu-lint f=${file path}`: Automatically adds Pangu spacing for clearer and more readable document formatting
3. Chinese documentation writing guide: https://github.com/stars/yuluo-yx/lists/docs
