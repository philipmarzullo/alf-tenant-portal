export default function PageWrapper({ children }) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
      {children}
    </div>
  );
}
