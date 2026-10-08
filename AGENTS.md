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
- Content is personal per account (`created_by` + `can_see_content`): members see only their own items, the main owner sees the whole workspace; model servers stay shared per owner and are managed by anyone passing `can_manage_models`.
- Member navigation and model disclosure derive from the database-backed `my_workspace_access` function so client state cannot elevate permissions.
- Self-hosted model server URLs are stored per owner in `model_endpoints` (owner-only RLS) so models change without rebuilding.
- Assistant conversations persist as workspace-scoped threads with route-derived IDs; message files remain private library assets.
- The video editor renders/mixes in-browser and exports through MediaRecorder with Mediabunny H.264/AAC fast-start MP4 conversion; a lazy browser-only single-thread WASM fallback handles small local files when native codecs are absent. Large unsupported jobs fail visibly without silently lowering quality. Projects persist as JSON with library paths and a local backup.
- Server-side workspace endpoint checks disable all paid fallback paths once any open model is enabled and linked, so service failures cannot consume unexpected gateway credits.
- Ads reuse studio permissions and private media storage; self-hosted chat uses OpenAI-compatible streaming, SDXL uses A1111, and other visual models require an owner-supplied ComfyUI API graph instead of guessed node schemas.
