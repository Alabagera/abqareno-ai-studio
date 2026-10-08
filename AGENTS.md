<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- AI models are listed in `src/lib/ai/registry.ts`; UI reads only from it so models can be swapped without UI rewrites.
- User files go to the private `media` storage bucket under `<user_id>/<kind>/` and are indexed in `media_assets`; video jobs live in `video_projects`.
- Protected pages live under `src/routes/_authenticated/` (client-side auth gate, ssr disabled) because the session is browser-stored.
- Workspace sharing is owner-based: member assets and projects resolve through `workspace_owner_id`, while privileged account management stays in authenticated server functions.
- Member navigation and model disclosure derive from the database-backed `my_workspace_access` function so client state cannot elevate permissions.
- Self-hosted model server URLs are stored per owner in `model_endpoints` (owner-only RLS) so models change without rebuilding.
- Assistant conversations persist as workspace-scoped threads with route-derived IDs; message files remain private library assets.
- The video editor renders, mixes audio and exports entirely in the browser (canvas + Web Audio + MediaRecorder); projects persist as serialized JSON in `editor_projects` with media referenced by library path plus a localStorage backup for sudden exits.
