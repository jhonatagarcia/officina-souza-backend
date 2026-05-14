export class RetryableNotificationJobError extends Error {
  constructor(
    message: string,
    readonly reason: string,
  ) {
    super(message);
    this.name = RetryableNotificationJobError.name;
  }
}
