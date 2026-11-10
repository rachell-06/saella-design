# PRODUCT.md: Saella Platform

Who uses Saella, what for, and how the interface should feel. This file holds only what rarely changes; for module status, versions and roadmap, read the PRD Master directly: https://pgg-prd-lib.vercel.app/docs/saella-prd-master (this file was written against v1.7.4, 2026-11-03). Color, type and components: `Design system/DESIGN.md`.

## 1. Product

An AI-assisted outreach platform for Southeast Asia: find customers, then reach them by email and social media from one workspace.

The promise (PRD): help a small SEA business find companies to sell to, send professional email from day one and stay present on social media, **without a sales team, a content team or technical staff**.

Four pillars (PRD):

| Pillar | What it means in the UI |
|---|---|
| **Find** | Nearly 3M company records across 7 markets (VN, SG, MY, ID, TH, BN, PH), with each country's industry codes (VSIC, SSIC, TSIC, MSIC, KBLI, PSIC) mapped to one set |
| **Send right** | Compliant email (DKIM, SPF, DMARC, low bounce) without the user needing to understand the technical side |
| **Done for you** | The agent builds campaigns; the user approves before anything risky happens (which steps are gated is pending, see `Design system/decisions.md`) |
| **Be present on social** | Post once to several networks (Facebook, Instagram, Threads, LinkedIn, TikTok, YouTube); in pilot |

Main modules: SEA company data, contacts, campaigns + templates, sending + automation (schedules, follow-ups), tracking + reports, agent, organization + roles, sending setup (domains), notifications + language. In progress: billing + credits, unified social.

## 2. Users

The PRD names three groups:

1. **Need new leads but have few contacts of their own** (selling B2B): small business owners, founders, people who sell on top of other jobs.
2. **Want to find leads and also work their existing contact lists** (B2B and B2C).
3. **Creators** who want to grow their reputation on social media.

Context of use *(inferred from the PRD pain points)*:
- Small teams with no sales ops and no email specialist. They don't know what DKIM/SPF is and shouldn't have to.
- They use the app in between other work, not all day. They come in to approve what the agent proposed, check how campaigns are doing, and handle warnings.
- Their biggest fear is a mistake at scale: one broken merge tag sent to thousands of people can't be taken back and costs credibility.
- Multi-language, multi-country; company names, addresses and industry codes differ by country.
- Two main time zones: GMT+7 (Vietnam, Thailand, western Indonesia) and GMT+8 (Singapore, Malaysia, Brunei, Philippines, central Indonesia); eastern Indonesia is GMT+9. Users and their recipients are often an hour apart, so a time without its zone is ambiguous. The gap is small enough that sending in each recipient's local time is not worth the complexity.

Roles (PRD Organization & Roles): admin by company domain, member approval, admin transfer. Templates: owner and admin can do everything, shared members can edit, schedule, send and copy, everyone else can view and copy.

## 3. Jobs to be done

| Job | What the user needs to see right away |
|---|---|
| Build a list of prospects | How many companies a country + industry filter returns, how many have an email, which ones are already saved |
| Send a campaign without fear of mistakes | Preview with each recipient's real data, warnings for missing merge tags, recipient count before pressing send |
| Know whether a campaign works | Delivery, open, click, reply, bounce, unsub; danger (high bounce) must stand out |
| Follow up without remembering to | Automated sequences, who is at which step |
| Hand work to the agent | The agent proposes, the user sees exactly what will change and approves or edits |
| Keep the sending domain healthy | Domain status, automatic pause when bounce hits the limit, the reason in plain words |

## 4. Interface personality

Three words: **tidy, trustworthy, hardworking** *(inferred from the LP brand: the character's "she does the work, you approve", hardworking, neat, friendly without showing off)*.

Feelings to create:
- **Reassured**: before any action that can't be undone, the user knows exactly what will happen.
- **Unburdened**: the agent and good defaults do the heavy lifting; the user mostly approves.
- **In control**: real numbers, stated plainly, nothing dressed up.

UI copy: plain English, specific verbs ("Send to 1,240 contacts", not "Proceed"), outcome first, no technical terms when a plain phrase exists (explain DKIM in an ⓘ, don't put it in a label). Call it **agent**, never "assistant". No praise, no hype, no emoji in product UI.

## 5. Must not look like

- **The default AI dashboard**: dark background, purple gradient, pill badges, four identical stat cards at the top of every page, decorative charts that answer no question.
- **A noisy growth-hack tool**: countdown timers, red-orange everywhere, boastful numbers.
- **A heavy enterprise CRM** (HubSpot, Salesforce): deep nested menus, dense settings screens. Saella is for teams without a tool admin.
- **A landing page inside the app**: heroes, large illustrations, the full-body character outside onboarding.
- **An agent that takes over**: the agent sending or making risky changes without the user seeing it first.

References worth learning from (details in `Competitor.md`): Apollo.io (lead search + filters), Mailchimp (editor, campaign reports), Clay/Unify (agent proposals, draft approval), Buffer (multi-network posting).

## 6. Design principles

The why behind the rules. The rules themselves live in `Design system/DESIGN.md` section 2; when this file and DESIGN.md differ, DESIGN.md wins.

1. **Approve first, run second.** Before anything that can't be undone (a bulk send, an agent action the user gated), the user sees who, what and how many. Irreversible actions say so.
2. **Real numbers, said plainly.** Show the number, don't prettify it or color it without a real threshold. When there's too little data, say so instead of inferring.
3. **Hide the technical, never the truth.** DKIM, SPF and per-country industry codes are put in plain words; but when a domain fails or sending is paused, state the reason and what to do.
4. **One main job per screen.** Users drop in between other work, so they must grasp the situation in seconds; everything secondary steps back.
5. **Dense but scannable.** Tables are the center of the product; density is fine as long as the eye can scan a column without effort.
