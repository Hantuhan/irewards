import type { SimpleCategoryProfile } from "@/lib/menu/simple-category-profile";
import { simpleCategoryProfileHasDisplay } from "@/lib/menu/simple-category-profile";

type MenuSimpleCategoryDisplayProps = {
  profile: SimpleCategoryProfile;
};

export function MenuSimpleCategoryDisplay({ profile }: MenuSimpleCategoryDisplayProps) {
  if (!simpleCategoryProfileHasDisplay(profile)) return null;

  return (
    <div className="mt-5 border border-surface-container-highest bg-surface-container-lowest p-4">
      <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
        Details
      </p>
      {profile.notes && profile.notes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile.notes.map((note) => (
            <span
              key={note}
              className="border border-surface-container-highest px-2 py-0.5 text-body-md text-on-surface"
            >
              {note}
            </span>
          ))}
        </div>
      )}
      {profile.serveNote ? (
        <p className="mt-3 text-body-md leading-relaxed text-on-surface">{profile.serveNote}</p>
      ) : null}
    </div>
  );
}
