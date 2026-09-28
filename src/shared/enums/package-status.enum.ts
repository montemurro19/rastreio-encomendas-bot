export enum PackageStatus {
  UNKNOWN = 'UNKNOWN',
  POSTED = 'POSTED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  DELAYED = 'DELAYED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
  EXCEPTION = 'EXCEPTION',
}

export const PackageStatusLabels: Record<PackageStatus, string> = {
  [PackageStatus.UNKNOWN]: 'Desconhecido',
  [PackageStatus.POSTED]: 'Objeto postado',
  [PackageStatus.IN_TRANSIT]: 'Em trânsito',
  [PackageStatus.OUT_FOR_DELIVERY]: 'Saiu para entrega',
  [PackageStatus.DELIVERED]: 'Entregue',
  [PackageStatus.DELAYED]: 'Atrasado',
  [PackageStatus.RETURNED]: 'Devolvido',
  [PackageStatus.CANCELLED]: 'Cancelado',
  [PackageStatus.EXCEPTION]: 'Exceção / Problema',
};

export const PackageStatusIcons: Record<PackageStatus, string> = {
  [PackageStatus.UNKNOWN]: '❓',
  [PackageStatus.POSTED]: '📦',
  [PackageStatus.IN_TRANSIT]: '🚚',
  [PackageStatus.OUT_FOR_DELIVERY]: '🛵',
  [PackageStatus.DELIVERED]: '🎉',
  [PackageStatus.DELAYED]: '⏳',
  [PackageStatus.RETURNED]: '↩️',
  [PackageStatus.CANCELLED]: '❌',
  [PackageStatus.EXCEPTION]: '⚠️',
};
