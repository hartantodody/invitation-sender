# Supabase Setup Notes

1. Open the Supabase SQL editor.
2. Run [schema.sql](./schema.sql) to create tables, constraints, triggers, and RLS policies.
3. The latest schema includes guest `shift` support (1/2/3). Re-run `schema.sql` safely to apply updates on existing tables.
4. In your local env file, set:

```bash
DATABASE_URL=postgresql://postgres:...@db.<project-ref>.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
# optional alternative:
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

The app accepts either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
