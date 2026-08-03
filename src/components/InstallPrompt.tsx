"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function subscribeNoop() {
  return () => {};
}

// SSR時は常にfalse、クライアントでのhydration後にtrueへ切り替える（setStateを使わずに済む）
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

// iOS Safariには beforeinstallprompt が無いため、共有→ホーム画面追加の手順を図解で案内する（DESIGN.md §9.2）
// mounted で最初のクライアント描画までは何も出さず、SSRとのhydration不一致を避ける。
export default function InstallPrompt() {
  const mounted = useMounted();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!mounted || dismissed || isStandalone()) {
    return null;
  }

  const showIosGuide = isIos();
  if (!deferredPrompt && !showIosGuide) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface p-4 shadow-[0_-10px_30px_-15px_rgba(16,27,51,0.3)]">
      <div className="mx-auto flex max-w-md items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">ホーム画面に追加</p>
          {deferredPrompt ? (
            <p className="mt-1 text-xs text-muted">朝・夜の通知を受け取れるようになります。</p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              共有ボタンから「ホーム画面に追加」を選んでください。
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {deferredPrompt && (
            <button
              onClick={async () => {
                await deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                setDeferredPrompt(null);
              }}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              追加する
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-muted underline underline-offset-2"
          >
            後で
          </button>
        </div>
      </div>
    </div>
  );
}
