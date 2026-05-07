# Pretty Const

A small VS Code extension for repos where JavaScript const objects live inside templates or mixed-language files.

Run **Pretty Const: Format Const** on a selection that is either:

```jade
- const cards = [{title: 'One', href: '/one'}, {title: 'Two', href: '/two'}]
```

or just the initializer:

```js
;[ { title: 'One', href: '/one' }, { title: 'Two', href: '/two' }, ]
```

The extension:

- formats only selected const declarations or selected object/array initializers;
- uses the workspace-local `prettier` package when one exists;
- loads the project Prettier config via `resolveConfig`;
- falls back to the bundled Prettier package with options derived from VS Code editor settings when no project Prettier is found.

No keybinding is registered by default. Add your own VS Code keybinding for `prettyConst.format` if you want one.
