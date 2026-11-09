// Usage notes for AI agents, one `<component>.meta.ts` next to each component file.
// The component file says how it looks; the meta says when to use it, with what, and what not to do.
// Rules that apply to the whole app stay in `01 Docs/Design system/DESIGN.md`: reference them, don't copy them.
export type ComponentMeta = {
  name: string;
  /** atom = shadcn primitive (ui/), molecule/organism = composed in saella/. */
  category: "atom" | "molecule" | "organism";
  description: string;
  /** Variant or prop value → when to use it. */
  variants?: Record<string, string>;
  relationships?: {
    /** Components or screens this usually sits in. */
    usedIn?: string[];
    /** Use these instead in the given situation. */
    preferInstead?: Record<string, string>;
  };
  /** Tokens from `src/styles/tokens.css` that this component reads. */
  tokens: string[];
  aiHints: string[];
  /** Combinations that must never be built. */
  invalid?: string[];
};
