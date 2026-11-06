export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="flex min-h-dvh flex-1 flex-col bg-surface">{children}</main>;
}
