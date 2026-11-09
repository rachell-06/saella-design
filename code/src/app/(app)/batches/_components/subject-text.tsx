import { MERGE_TAGS, splitTags } from "@/lib/mock/templates";

const TAG_LABEL = new Map<string, string>(MERGE_TAGS.map((m) => [m.tag, m.label]));

// Subject with its merge tags as compact chips named like the editor's tag menu ("First name"), not the raw
// {{recipient_first_name}} that truncated the line (2026-11-05; report header and New batch). Chip style from the template editor (TagText).
export function SubjectText({ subject }: { subject: string }) {
  return (
    <>
      {splitTags(subject).map((p, i) =>
        p.tag ? (
          <span key={i} className="inline-flex items-center rounded-sm bg-primary-subtle px-1 align-baseline text-xs leading-5">
            {TAG_LABEL.get(p.tag) ?? p.tag}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}
