# Nibras authentication email templates

These bilingual, email-client-safe templates are applied to the linked Supabase project's Auth configuration. They deliberately use `{{ .ConfirmationURL }}` so Supabase can securely verify the token before redirecting to `https://www.nibrasedtech.com`.

The public logo is stored at:

`https://tkhmeczupudwsqkluztz.supabase.co/storage/v1/object/public/email-assets/nibras-logo.png`

Templates included: invitation, password recovery, magic link, email confirmation, and email address change.
