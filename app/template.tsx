// Re-mounts on every navigation, so each page's content fades in and rises 8px.
// The header and footer live in the layout and stay still.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="motion-enter flex flex-1 flex-col">{children}</div>;
}
