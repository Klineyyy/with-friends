import { router } from "expo-router";

/** Set by `PostsProvider` whenever the signed-in user changes. */
let myId: string | null = null;
export function setMyId(id: string | null) {
  myId = id;
}

/** Your own profile is the Profile tab; anyone else's opens on top (board 12). */
export function openProfile(userId: string) {
  if (userId === myId) router.navigate("/profile");
  else router.push({ pathname: "/user/[id]", params: { id: userId } });
}

/** Open the one-to-one thread with someone (board 15). */
export function openThread(userId: string) {
  router.push({ pathname: "/thread/[id]", params: { id: userId } });
}
