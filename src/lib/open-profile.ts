import { router } from "expo-router";

import { ME_ID } from "./mock-data";

/** Your own profile is the Profile tab; anyone else's opens on top (board 12). */
export function openProfile(userId: string) {
  if (userId === ME_ID) router.navigate("/profile");
  else router.push({ pathname: "/user/[id]", params: { id: userId } });
}

/** Open the one-to-one thread with someone (board 15). */
export function openThread(userId: string) {
  router.push({ pathname: "/thread/[id]", params: { id: userId } });
}
