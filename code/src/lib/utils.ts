import { createCn } from "cn/config";

// Class merging that knows Saella's own theme utilities (tokens.css @theme). The stock `cn` treats unknown names
// as colours or leaves conflicts in place: `text-dense` was dropped next to `text-muted-foreground` (every table
// header lost its 13px size), and `rounded-lg rounded-card` both stayed. Add a group here whenever tokens.css
// gains a non-colour utility (radius, shadow, font size, tracking, easing, font family).
// tsconfig.json maps the bare "cn" import to this file, so shadcn components (`import { cn } from "cn"`),
// including ones added later with `npx shadcn add`, use it too.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["dense"] }],
      rounded: [{ rounded: ["card"] }],
      shadow: [{ shadow: ["card", "float"] }],
      tracking: [{ tracking: ["display", "title"] }],
      ease: [{ ease: ["standard", "emphasized"] }],
      "font-family": [{ font: ["heading"] }],
    },
  },
});
