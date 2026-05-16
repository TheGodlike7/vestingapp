-- Claims are intentionally disabled until the secure on-chain path is ready.
-- Remove the legacy unauthenticated RPC surface in the meantime.

drop function if exists public.claim_tokens(uuid, numeric);

revoke execute on function public.claim_tokens(uuid, numeric, text, text)
  from public, anon, authenticated;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

revoke execute on function public.rls_auto_enable()
  from public, anon, authenticated;

alter function public.claim_tokens(uuid, numeric, text, text)
  set search_path = public, pg_temp;

alter function public.handle_new_user()
  set search_path = public, pg_temp;
