"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase";

type AccountSettingsViewProps = {
  noteCount: number;
  favoriteCount: number;
};

type AuthState = {
  email: string;
  status: "checking" | "signed-in" | "signed-out";
  message: string;
};

export function AccountSettingsView({ favoriteCount, noteCount }: AccountSettingsViewProps) {
  const [email, setEmail] = useState("");
  const [auth, setAuth] = useState<AuthState>({ email: "", status: "checking", message: "正在檢查登入狀態..." });
  const [sending, setSending] = useState(false);

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuth({ email: "", status: "signed-out", message: "尚未設定 Supabase 前端金鑰，暫時使用本機備註。" });
      return;
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      const userEmail = data.session?.user.email ?? "";
      if (error || !userEmail) {
        setAuth({ email: "", status: "signed-out", message: "尚未登入，個人備註會先保存在這台裝置。" });
        return;
      }
      setAuth({ email: userEmail, status: "signed-in", message: "已登入，個人備註會同步到 Supabase。" });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userEmail = session?.user.email ?? "";
      setAuth(
        userEmail
          ? { email: userEmail, status: "signed-in", message: "已登入，個人備註會同步到 Supabase。" }
          : { email: "", status: "signed-out", message: "尚未登入，個人備註會先保存在這台裝置。" }
      );
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function sendMagicLink() {
    if (!supabase || !email.trim()) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    setSending(false);
    setAuth((current) => ({
      ...current,
      message: error ? "登入信寄送失敗，請確認 Email 或 Supabase Auth 設定。" : "已寄出登入信，請到信箱點擊連結。"
    }));
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuth({ email: "", status: "signed-out", message: "已登出，之後會先使用本機備註。" });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[22px] border border-[#dbe5f4] bg-white p-5 shadow-[0_12px_34px_rgba(8,35,80,.08)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#60708d]">Account</p>
            <h2 className="mt-1 text-2xl font-black text-[#061b3d]">帳號與個人資料同步</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[#60708d]">登入後，我的備註會依使用者分開保存，不會跟其他業務共用。</p>
          </div>
          <StatusBadge status={auth.status} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoTile label="目前備註" value={`${noteCount} 筆`} />
          <InfoTile label="收藏醫師" value={`${favoriteCount} 位`} />
          <InfoTile label="同步模式" value={auth.status === "signed-in" ? "Supabase" : "本機備援"} />
        </div>

        <div className="mt-6 rounded-2xl border border-[#dbe5f4] bg-[#f8fbff] p-4">
          <h3 className="text-lg font-black text-[#061b3d]">登入狀態</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-[#60708d]">{auth.message}</p>
          {auth.email ? <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-black text-[#0d2348]">目前帳號：{auth.email}</p> : null}

          {auth.status === "signed-in" ? (
            <button className="mt-4 h-11 rounded-xl border border-[#dbe5f4] px-5 text-sm font-black text-[#075de8]" onClick={signOut} type="button">
              登出
            </button>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
              <input
                className="h-12 rounded-xl border border-[#dbe5f4] px-4 text-sm font-bold outline-none focus:border-[#075de8]"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="輸入 Email 收登入信"
                type="email"
                value={email}
              />
              <button className="h-12 rounded-xl bg-[#075de8] px-5 text-sm font-black text-white disabled:opacity-50" disabled={sending || !email.trim()} onClick={sendMagicLink} type="button">
                {sending ? "寄送中" : "寄送登入信"}
              </button>
            </div>
          )}
        </div>
      </section>

      <aside className="grid gap-4">
        <section className="rounded-[22px] border border-[#dbe5f4] bg-white p-5 shadow-[0_12px_34px_rgba(8,35,80,.08)]">
          <h3 className="text-lg font-black text-[#061b3d]">同步說明</h3>
          <ul className="mt-4 grid gap-3 text-sm font-bold leading-6 text-[#60708d]">
            <li>未登入時，備註只保存在目前瀏覽器。</li>
            <li>登入後，儲存備註會同步到 Supabase。</li>
            <li>不同使用者只能讀寫自己的備註。</li>
          </ul>
        </section>
        <section className="rounded-[22px] border border-[#dbe5f4] bg-[#eaf2ff] p-5">
          <h3 className="text-lg font-black text-[#061b3d]">下一步</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-[#375071]">等你確認登入信流程可用後，就能把收藏也搬到 Supabase，讓手機與電腦共用同一份業務資料。</p>
        </section>
      </aside>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f4f8ff] p-4">
      <p className="text-sm font-black text-[#60708d]">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#061b3d]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: AuthState["status"] }) {
  const label = status === "signed-in" ? "已登入" : status === "checking" ? "檢查中" : "未登入";
  const className = status === "signed-in" ? "bg-[#dff7ed] text-[#047857]" : status === "checking" ? "bg-[#eaf2ff] text-[#075de8]" : "bg-[#fff1e8] text-[#f97316]";

  return <span className={`rounded-full px-4 py-2 text-sm font-black ${className}`}>{label}</span>;
}
