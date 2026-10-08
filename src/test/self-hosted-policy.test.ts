import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ linked: vi.fn(), only: vi.fn(), auth: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/voice-backend.server", () => ({ authVoice: mock.auth, linkedEndpoint: mock.linked, selfHostedOnly: mock.only }));
import { Route as tts } from "@/routes/api/tts";
import { Route as stt } from "@/routes/api/stt";
import { Route as translate } from "@/routes/api/translate";
type HandlerRoute = { server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } } };
const call = (route: unknown, request: Request) => (route as HandlerRoute).server.handlers.POST({ request });
beforeEach(() => { vi.restoreAllMocks(); mock.auth.mockResolvedValue({ sb: {}, userId: "test" }); mock.only.mockResolvedValue(true); mock.linked.mockResolvedValue(null); });
describe("Self-hosted workspaces never fall back to paid AI", () => {
  it("blocks paid voice if XTTS is not linked", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const result = await call(tts, new Request("http://localhost/api/tts", { method: "POST", body: JSON.stringify({ text: "مرحبا" }), headers: { "Content-Type": "application/json" } }));
    expect(result.status).toBe(409); expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not fall back when XTTS fails", async () => {
    mock.linked.mockResolvedValue({ url: "https://model.example", token: "" });
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("offline", { status: 503 }));
    const result = await call(tts, new Request("http://localhost/api/tts", { method: "POST", body: JSON.stringify({ text: "Hello" }), headers: { "Content-Type": "application/json" } }));
    expect(result.status).toBe(502); expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0]?.[0]).toBe("https://model.example/tts_to_audio/");
  });
  it("blocks paid transcription if Whisper is not linked", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch"); const form = new FormData(); form.append("file", new File(["audio"], "audio.webm", { type: "audio/webm" }));
    const result = await call(stt, new Request("http://localhost/api/stt", { method: "POST", body: form }));
    expect(result.status).toBe(409); expect(fetcher).not.toHaveBeenCalled();
  });
  it("blocks paid translation if local translation is not linked", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const result = await call(translate, new Request("http://localhost/api/translate", { method: "POST", body: JSON.stringify({ texts: ["مرحبا"], target: "en" }), headers: { "Content-Type": "application/json" } }));
    expect(result.status).toBe(409); expect(fetcher).not.toHaveBeenCalled();
  });
});