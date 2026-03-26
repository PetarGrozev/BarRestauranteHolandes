import OrderPageClient from '../../order/OrderPageClient';

type CustomerTablePageProps = {
  params: Promise<{ tableId?: string }>;
};

export default async function CustomerTablePage({ params }: CustomerTablePageProps) {
  const resolvedParams = await params;
  const rawTableId = Number(resolvedParams?.tableId);
  const initialTableId = Number.isInteger(rawTableId) && rawTableId > 0 ? rawTableId : null;

  return <OrderPageClient initialTableId={initialTableId} mode="customer" />;
}