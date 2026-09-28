export class TrackingProviderNotFoundError extends Error {
  constructor(trackingCode: string) {
    super(`No tracking provider found for tracking code: ${trackingCode}`);
    this.name = 'TrackingProviderNotFoundError';
  }
}

export class CarrierUnavailableError extends Error {
  constructor(carrier: string, message?: string) {
    super(
      `Carrier service "${carrier}" is currently unavailable. ${message || ''}`,
    );
    this.name = 'CarrierUnavailableError';
  }
}

export class InvalidTrackingCodeError extends Error {
  constructor(trackingCode: string) {
    super(`Invalid tracking code format: ${trackingCode}`);
    this.name = 'InvalidTrackingCodeError';
  }
}

export class PackageNotFoundError extends Error {
  constructor(packageId: string) {
    super(`Package with id "${packageId}" was not found.`);
    this.name = 'PackageNotFoundError';
  }
}

export class UnauthorizedPackageAccessError extends Error {
  constructor() {
    super('User is not authorized to access this package.');
    this.name = 'UnauthorizedPackageAccessError';
  }
}
