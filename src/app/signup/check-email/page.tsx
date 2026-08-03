export default function CheckEmailPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <p className="font-mono text-xs tracking-widest text-brand-600">UKATTA</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">確認メールを送りました</h1>
        <p className="mt-4 text-sm text-muted">
          メール内のリンクをクリックすると、登録が完了します。届かない場合は迷惑メールフォルダもご確認ください。
        </p>
      </div>
    </div>
  );
}
