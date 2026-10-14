# SimplyScan testbed

A **deliberately vulnerable** website used to test [SimplyScan](https://simplyscan.io).
Live at **https://daniel-agoston.github.io/simplyscan-testbed/**. It stays up on purpose.

**Every planted secret in the static site is FAKE**: random characters in the shape of a
real credential (Stripe, AWS, GitHub, database passwords …). None of them works anywhere.
One exception, on purpose: the `backends/` page carries the REAL public config of the
dedicated test Firebase and Appwrite projects (a Firebase web key and project IDs). Those
values are public by design, every Firebase web app ships them; the projects hold only fake
records. The scrambling in `fakes.scrambled.json` is not protection, only a way past
GitHub's push scanner.
Do not copy anything here as an example of how to build a site.

`ANSWER-KEY.md` lists every planted problem, where it is, and the SimplyScan check
that should catch it. Score a scan by comparing its findings with that list.
