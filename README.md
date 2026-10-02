# Pretty Const

A small VS Code extension for repos where JavaScript const objects live inside templates or mixed-language files.

[Marketplace](https://marketplace.visualstudio.com/items?itemName=bridgerosepetal.pretty-const)

## Install

Open the VS Code command palette with `F1`, run **Extensions: Install Extensions**, then search for **Pretty Const**.

In Jade/Pug files, save the file or run **Pretty Const: Format Const** to format all
unambiguous `- const` object/array declarations.

You can also run **Pretty Const: Format Const** on a selection that is either:

```jade
- const cards = [{title: 'One', href: '/one'}, {title: 'Two', href: '/two'}]
```

or just the initializer:

```js
;[
	{ title: 'One', href: '/one' },
	{ title: 'Two', href: '/two' },
]
```

The extension:

- formats only selected const declarations or selected object/array initializers;
- uses the workspace-local `prettier` package when one exists;
- loads the project Prettier config via `resolveConfig` (always formatting with the `babel` parser; `parser` and `plugins` from the config are ignored, so configs that use `@prettier/plugin-pug` still work);
- falls back to the bundled Prettier package with options derived from VS Code editor settings when no project Prettier is found.

Format on save is enabled by default. Set `"prettyConst.formatOnSave": false` to turn it off and only format via the command.

No keybinding is registered by default. Add your own VS Code keybinding for `prettyConst.format` if you want one.
