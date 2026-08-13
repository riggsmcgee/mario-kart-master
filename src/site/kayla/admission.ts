/**
 * The one thing that gets written down. (4e4, second pass)
 *
 * Riggs, 2026-08-13: *"If she makes it all the way to the website, then you can let her have access
 * to it just like everyone else."*
 *
 * For ten minutes this experience has promised, repeatedly and in writing, that nothing about Kayla
 * is ever recorded. That promise is load-bearing — it is in the sign-off card, it is why
 * `progress.ts` refuses to push the `kayla` role to the server, and it is the reason the whole thing
 * can be nosy without being creepy. Admitting her breaks it, and the ending does not hide that. It
 * makes it the ceremony:
 *
 *   *"There is nothing here to unlock. I have said that twice now."*
 *   *"So I will write your name down instead. I have never done that."*
 *
 * **It is deliberately not a role change**, and that is the most important line in this file. Setting
 * `role: 'other'` would be the obvious way to let her in, and on Jodi's machine it would sync
 * straight to Jodi's signed-in profile — the site would start calling Jodi "Kayla" on every device
 * she owns. That is precisely the launch-blocking bug 4f1 already caught once, in this exact corner,
 * and it is not being reintroduced for a nicer-looking implementation. Her role stays `kayla`, stays
 * local, and never reaches the server; this flag sits beside it and does one job.
 *
 * **Local to the machine, on purpose.** The laptop she found this on is the laptop she earned it on.
 */

const KEY = 'mkm.kayla.admitted.v1';

/** Has she been through it and said yes three times? */
export function isAdmitted(): boolean {
  try {
    return localStorage.getItem(KEY) === 'yes';
  } catch {
    // Private browsing. She gets the ten minutes again, which is not the worst outcome available.
    return false;
  }
}

export function admit(): void {
  try {
    localStorage.setItem(KEY, 'yes');
  } catch {
    // The unlock holds for this session and no longer. Nothing here was ever meant to be permanent.
  }
}

/** For the settings page's "clear progress", so the machine can be handed back. */
export function forgetAdmission(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}
