import { PackageStatus } from '../enums/package-status.enum';

export interface TrackingEventResult {
  status: PackageStatus;
  description: string;
  location?: string;
  eventDate: Date;
  rawData?: unknown;
}

export interface TrackingResult {
  trackingCode: string;
  status: PackageStatus;
  carrier?: string;
  events: TrackingEventResult[];
}
