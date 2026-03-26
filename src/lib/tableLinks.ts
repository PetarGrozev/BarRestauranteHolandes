export function getCustomerTablePath(tableId: number) {
  return `/mesa/${tableId}`;
}

export function getCustomerTableUrl(origin: string, tableId: number) {
  return `${origin}${getCustomerTablePath(tableId)}`;
}