import { DocPage } from "@/components/DocPage";

/** Community rules (not on the board). Linked from onboarding and Settings. */
export default function CommunityRules() {
  return (
    <DocPage
      title="Community rules"
      intro="With Friends is a small, private place for people who know each other. A few rules keep it that way."
      sections={[
        {
          heading: "Be kind",
          body: "No bullying, harassment, threats, or hate. Disagree with care, or don't comment.",
        },
        {
          heading: "Share what's yours to share",
          body: "Ask before posting photos or videos of other people, especially children. Don't share someone's private messages.",
        },
        {
          heading: "Keep it safe for everyone",
          body: "No nudity or sexual content, graphic violence, or anything that encourages people to hurt themselves or others. Nothing illegal.",
        },
        {
          heading: "Be real",
          body: "Use your own account. No spam, selling, or made-up stories presented as news.",
        },
        {
          heading: "Tell us when something's wrong",
          body: "Report a post, comment, or person from its ⋯ menu. They won't know it was you. You can block anyone at any time, and they won't be told.",
        },
        {
          heading: "What happens next",
          body: "We read every report. Posts that break these rules are removed, and accounts that keep breaking them are closed.",
        },
      ]}
    />
  );
}
