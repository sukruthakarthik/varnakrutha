/** Re-mounts on every navigation, so each public page fades in rather than snapping into place. */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in duration-700">{children}</div>;
}
