import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  RawBody,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { WhatsAppWebhookService } from 'src/notifications/whatsapp-webhook.service';
import {
  WhatsAppWebhookPayload,
  WhatsAppWebhookResponse,
} from 'src/notifications/whatsapp-webhook.types';

@ApiTags('WhatsApp Webhooks')
@SkipThrottle()
@Controller({ path: 'webhooks/whatsapp', version: '1' })
export class WhatsAppWebhookController {
  constructor(private readonly whatsAppWebhookService: WhatsAppWebhookService) {}

  @Get()
  @ApiOperation({ summary: 'Valida webhook do WhatsApp na Meta' })
  verifyWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    return this.whatsAppWebhookService.verifyChallenge(mode, verifyToken, challenge);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recebe eventos do WhatsApp Cloud API' })
  receiveWebhook(
    @Body() payload: WhatsAppWebhookPayload,
    @Headers('x-hub-signature-256') signature?: string,
    @RawBody() rawBody?: Buffer,
  ): WhatsAppWebhookResponse {
    return this.whatsAppWebhookService.processWebhook(payload, signature, rawBody);
  }
}
