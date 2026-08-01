# Prompt: Remove Google and Apple Login

You are working on the SahlDZ restaurant-management application. Remove Google and Apple social login completely from the application while preserving email/password authentication.

## Requirements

1. Remove the Google and Apple login buttons from:
   - `src/routes/login.tsx`
   - `src/routes/signup.tsx`
2. Remove the related handler functions and unused imports, including OAuth-specific code and icons if they are no longer used.
3. Remove calls to `supabase.auth.signInWithOAuth()` for Google and Apple.
4. Do not remove or break:
   - Email/password login.
   - Email/password signup.
   - Password confirmation and validation.
   - Email verification flow.
   - Redirect logic after successful authentication.
   - Existing rate limiting for email/password authentication.
5. Review the Firebase compatibility adapter and remove or clearly isolate unused social-auth code only if it is not used anywhere else. Do not remove general authentication functionality required by email/password login.
6. Search the whole repository for Google/Apple login references and remove obsolete UI, handlers, comments, and configuration references related specifically to social login.
7. Do not remove unrelated Google or Apple references, such as Google Maps review URLs, Google Analytics/reporting integrations, or Apple icons/assets unrelated to authentication.
8. Keep the Arabic RTL design and the existing authentication page layout consistent after removing the social-login section. Remove the social-login divider if no longer needed.
9. Update any documentation that incorrectly states that Google or Apple login is available.

## Validation

Run the following commands after the changes:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Also verify manually that:

- The login page contains only email/password authentication.
- The signup page contains only email/password registration.
- Invalid email/password input still displays validation errors.
- Successful email/password login still redirects to `/dashboard` or `/setup` as appropriate.
- The application no longer calls `signInWithOAuth` for Google or Apple.
- No unused imports or dead social-login handlers remain.
- The build does not fail because of the removed OAuth code.

Do not change the Firebase-to-Supabase compatibility layer more than necessary for this task, and do not implement replacement authentication providers.
