import { TrackingResult } from '../../../shared/types/tracking.types';

export interface TrackingProvider {
  readonly name: string;
  canHandle(trackingCode: string): boolean;
  track(trackingCode: string): Promise<TrackingResult>;
}
