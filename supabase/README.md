# supabase/

Database schema for the project, as migrations. **The database is never hand-edited** — that's
the working agreement in [build-plan.md](../build-plan.md). Every change is a new file in
`migrations/`, so the schema can be rebuilt from scratch and reviewed in a diff.

## Applying migrations

The CLI is a devDependency, so `npx supabase` works without a global install.

```bash
npx supabase login                       # opens a browser, one time
npx supabase link --project-ref rmttesrgrblxzniaqkud
npx supabase db push                     # applies everything in migrations/
```

`link` will ask for the database password — that's the one set when the project was created,
not the anon key. It's stored locally by the CLI, not in this repo.

To check what would run without running it: `npx supabase db push --dry-run`.

## After every migration: regenerate the types

```bash
npx supabase gen types typescript --linked > ../src/backend/database.types.ts
```

`src/backend/database.types.ts` is generated — never edit it. `src/backend/schema.ts` holds the
hand-written domain aliases on top, so regenerating cannot clobber anything.

This matters more than it looks. postgrest-js checks the whole schema against an exact shape,
and a hand-written type that is subtly wrong fails *quietly*: `.select()` keeps working while
`.update()` starts taking `never`. Generating removes the whole class of problem.

## Adding a change later

```bash
npx supabase migration new add_something
```

Write the SQL into the generated file, then `db push`. Never edit a migration that has already
been applied — add a new one.

## What's in the schema

| Table | Holds |
|---|---|
| `profiles` | display name and role (`jodi` / `bill` / `kayla` / `other`), one row per user, created automatically on signup |
| `chapter_progress` | status, stars and best score per chapter per user |
| `plan_checks` | ticked boxes in the Ch8 practice programme; the row's existence *is* the tick |

Row-level security is on for all three, and every policy restricts access to `auth.uid()`.
That is what makes shipping the anon key in the browser safe, so **RLS must stay on** — a table
added later without it would be readable by anyone with the key, which is everyone.

## The test user

There isn't a seeded one. Auth users can be inserted by SQL, but doing it by hand produces a
row that doesn't match what the real signup flow creates, and the whole point of 1f4 is to
check that flow. The first magic-link sign-in at 1f2 creates the real test user, and the
trigger gives it a profile.
