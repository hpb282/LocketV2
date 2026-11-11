import { UserRound } from "lucide-react";
import type { PersonalProfile } from "./types";

export function Avatar({
  profile,
  large = false,
}: {
  profile: PersonalProfile;
  large?: boolean;
}) {
  return (
    <span className={`avatar ${large ? "large" : ""}`}>
      {profile.avatarId ? (
        <img
          src={`media://avatar/${profile.avatarId}`}
          alt={`Ảnh đại diện của ${profile.displayName}`}
        />
      ) : (
        <UserRound size={large ? 54 : 25} aria-hidden="true" />
      )}
    </span>
  );
}
