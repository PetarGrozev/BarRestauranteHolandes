import OrderPageClient from './OrderPageClient';

type OrderPageProps = {
  searchParams?: Promise<{ tableId?: string }>;
};

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawTableId = Number(resolvedSearchParams?.tableId);
  const initialTableId = Number.isInteger(rawTableId) && rawTableId > 0 ? rawTableId : null;

  return <OrderPageClient initialTableId={initialTableId} />;
}