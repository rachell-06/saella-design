import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Saella design-system guards (DESIGN.md mục 2 "Control", PATTERNS.md 9.13). The rules in the docs were not
// enough on their own: agents still hand-built controls and native tooltips, so lint now refuses them.

const RAW_CONTROLS = new Set(["button", "input", "select", "textarea"]);
// Elements whose title= reaches the DOM: lowercase tags and the shadcn parts that pass it through.
const TITLE_TARGETS = /^([a-z]+|TableCell|TableHead|Badge|Button|Link|Item)$/;

const attr = (opening, name) =>
  opening.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === name);

/** The nearest JSX element that contains this one, skipping {…} and ternaries in between. */
function parentElement(node) {
  let p = node.parent?.parent; // opening element → its element → upwards
  while (p && p.type !== "JSXElement") p = p.parent;
  return p;
}

/** Every string literal inside a className value, including inside cn(…) calls. */
function classText(value) {
  if (!value) return "";
  if (value.type === "Literal") return String(value.value);
  const out = [];
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (n.type === "Literal" && typeof n.value === "string") out.push(n.value);
    if (n.type === "TemplateElement") out.push(n.value.raw);
    for (const k of Object.keys(n)) if (k !== "parent") walk(n[k]);
  };
  walk(value);
  return out.join(" ");
}

const saella = {
  rules: {
    "no-raw-control": {
      meta: { type: "problem", schema: [] },
      create: (context) => ({
        JSXOpeningElement(node) {
          if (node.name.type !== "JSXIdentifier" || !RAW_CONTROLS.has(node.name.name)) return;
          // Hidden file input opened by a Button: shadcn has no file picker.
          if (attr(node, "type")?.value?.value === "file") return;
          // Wrapped by a shadcn component through asChild: allowed.
          const parent = parentElement(node);
          if (parent && attr(parent.openingElement, "asChild")) return;
          context.report({
            node,
            message: `Không tự vẽ <${node.name.name}>: dùng Button / Input / Select / Textarea / Item của shadcn, hoặc ListRow, ChipRemove (DESIGN.md mục 2 "Control"). Thẻ thô chỉ được nằm trong component shadcn qua asChild.`,
          });
        },
      }),
    },
    "no-native-title": {
      meta: { type: "problem", schema: [] },
      create: (context) => ({
        JSXOpeningElement(node) {
          if (node.name.type !== "JSXIdentifier" || !TITLE_TARGETS.test(node.name.name)) return;
          const title = attr(node, "title");
          if (!title) return;
          // Text cut with an ellipsis may repeat itself in title=.
          if (/\b(truncate|line-clamp-\d)\b/.test(classText(attr(node, "className")?.value))) return;
          context.report({
            node: title,
            message: 'Không dùng title= native: bọc phần tử bằng <Hint label=…> (PATTERNS.md 9.13). Chỉ chữ bị cắt (class truncate / line-clamp) được giữ title=.',
          });
        },
      }),
    },
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    plugins: { saella },
    rules: {
      "saella/no-raw-control": "error",
      "saella/no-native-title": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build output of the DS surface (next.config.ts distDir).
    ".next-ds/**",
  ]),
]);

export default eslintConfig;
