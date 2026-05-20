import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { GoogleIdentityService } from 'src/auth/services/google-identity.service';

describe('GoogleIdentityService', () => {
  const configServiceMock = {
    get: jest.fn(),
  };
  const verifyIdTokenMock = jest.fn();

  let service: GoogleIdentityService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-19T12:00:00.000Z').getTime());
    configServiceMock.get.mockReturnValue('google-client-id.test');
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(verifyIdTokenMock);
    service = new GoogleIdentityService(configServiceMock as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockGooglePayload(payload: Record<string, unknown>) {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-subject-1',
        email: 'Owner@Oficina.com',
        name: 'Owner Oficina',
        email_verified: true,
        iss: 'https://accounts.google.com',
        aud: 'google-client-id.test',
        exp: Math.floor(Date.now() / 1000) + 60,
        ...payload,
      }),
    });
  }

  it('should validate a valid Google ID token and normalize trusted claims', async () => {
    mockGooglePayload({});

    const result = await service.verifyCredential('valid-google-id-token');

    expect(verifyIdTokenMock).toHaveBeenCalledWith({
      idToken: 'valid-google-id-token',
      audience: 'google-client-id.test',
    });
    expect(result).toEqual({
      subject: 'google-subject-1',
      email: 'owner@oficina.com',
      name: 'Owner Oficina',
      emailVerified: true,
    });
  });

  it('should reject an invalid Google token', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('invalid signature'));

    await expect(service.verifyCredential('invalid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject an expired Google token', async () => {
    mockGooglePayload({ exp: Math.floor(Date.now() / 1000) - 1 });

    await expect(service.verifyCredential('expired-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a token with invalid issuer', async () => {
    mockGooglePayload({ iss: 'https://evil.example.com' });

    await expect(service.verifyCredential('invalid-issuer-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a token with invalid audience', async () => {
    mockGooglePayload({ aud: 'another-client-id' });

    await expect(service.verifyCredential('invalid-audience-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a Google account without verified email', async () => {
    mockGooglePayload({ email_verified: false });

    await expect(service.verifyCredential('unverified-email-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should fail closed when Google client id is not configured', async () => {
    configServiceMock.get.mockReturnValue(undefined);

    await expect(service.verifyCredential('valid-google-id-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });
});
