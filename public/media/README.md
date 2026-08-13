# public/media

Two clips of Riggs to camera, both optional, both absent by default. `intro.mp4` and `kayla.mp4`.

Keep both **H.264 in an MP4** (`libx264` + AAC). That is the one combination Safari and Chrome both
play without argument — a `.mov` straight off a phone is usually HEVC, which Chrome on Windows will
not decode. And keep each one **under 50 MB**: this directory is committed and served from GitHub
Pages, which warns past 50 and refuses past 100. A 720p talking head at ~2 Mbps is about 15 MB a
minute, and 720p is plenty for a face.

## `intro.mp4` — Chapter 0

The one that replaced the nine chapter voiceovers (2026-08-13). A short piece to camera explaining
what this site is, how it works, and what he wants her to do with it — it sits at the top of Chapter
0's lesson page, above the pitch and before Bayesic's twelve-minute anchor.

`src/ui/intro-video.ts` probes for the file before showing anything: no file means the whole block is
absent from the page, rather than a dead play button. Drop it in and it appears with no code change.

**Delivered 2026-08-13.** 2:50, 1280x720, H.264 High at 1.6 Mbps, AAC 128k, `+faststart` — 37 MB.
The original was the same 720p footage at 9.1 Mbps and 189 MB, which git will not take (GitHub warns
past 50 MB and refuses past 100), so it was re-encoded at CRF 23 rather than resized: the resolution
was already right and the bitrate was eight times what a talking head needs.

If it is ever re-cut, three minutes is the ceiling — Chapter 0 is the page most likely to be closed
early, and it already asks for twelve minutes of video after this one. The heading in
`intro-video.ts` names the length, so a re-cut that changes it should change that line too.

## `kayla.mp4` — the other end

A short piece to camera congratulating Kayla for getting through
*There Is No Course* (the ten minutes behind her own name at the doorman), and telling her that if
she really wants it, the site is hers. It plays as beat 8, right after the narrator has said
goodbye and meant it.

**It is optional and the ending is complete without it.** `beats/admission.ts` probes for the file
with a HEAD request before painting anything, and if it is absent she gets a written note in the
site's own type instead — no poster frame, no dead play button, nothing that reads as broken. Drop
the file in and it becomes a video with no code change, which is the same arrangement
`src/ui/intro-video.ts` uses at the other end.

A minute is plenty; two is long.
