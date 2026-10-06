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
