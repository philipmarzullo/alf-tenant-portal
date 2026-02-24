export default function PageWrapper({ children }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {children}
    </div>
  );
}
