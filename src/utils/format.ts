export const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};

export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString();
}; 