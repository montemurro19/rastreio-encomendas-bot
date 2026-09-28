export enum ConversationStep {
  IDLE = 'IDLE',
  WAITING_PACKAGE_NAME = 'WAITING_PACKAGE_NAME',
  WAITING_TRACKING_CODE = 'WAITING_TRACKING_CODE',
  VALIDATING = 'VALIDATING',
  COMPLETED = 'COMPLETED',
}

export interface ConversationState {
  step: ConversationStep;
  data: {
    packageName?: string;
    trackingCode?: string;
    carrier?: string;
    pendingPackageId?: string;
  };
  updatedAt: Date;
}
