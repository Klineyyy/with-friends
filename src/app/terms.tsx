import { DocPage } from "@/components/DocPage";

/**
 * Terms and privacy (not on the board). Linked from onboarding and Settings.
 * TEMPORARY: a plain-language draft that matches project-scope.md. Have the real
 * terms and privacy policy written and checked before release (Google Play needs
 * a privacy policy URL and the Data safety form to agree with it).
 */
export default function TermsAndPrivacy() {
  return (
    <DocPage
      title="Terms and privacy"
      intro="The short version of how With Friends works and what happens to your information."
      sections={[
        {
          heading: "Using With Friends",
          body: "You must follow the Community rules. You own what you post; by posting, you let us store it and show it to the members of With Friends. We can remove content or close accounts that break the rules.",
        },
        {
          heading: "What we keep",
          body: "Your name, email address, and photo from Google or Apple; your username and bio; the posts, comments, likes, follows, and messages you make; and, if you allow notifications, a token to send them to your phone.",
        },
        {
          heading: "Who sees what",
          body: "Your posts, profile, comments, and likes are visible to every member. Messages are seen only by you and the person you're talking to. People you block can't see your posts or message you.",
        },
        {
          heading: "What we don't do",
          body: "No ads, no selling your information, and no tracking across other apps. We collect crash reports so we can fix problems.",
        },
        {
          heading: "Deleting your account",
          body: "Settings → Delete account removes your profile, posts, comments, and likes. Messages you sent stay in the other person's chat, shown as from \"Deleted user\". You can also ask for deletion on our website.",
        },
      ]}
    />
  );
}
