type Props = {
  cols?: 3 | 4;
  children: React.ReactNode;
};

export function ProductFormFields({ cols = 4, children }: Props) {
  const colsClass = cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 ${colsClass} w-full gap-5`}>
      {children}
    </div>
  );
}
