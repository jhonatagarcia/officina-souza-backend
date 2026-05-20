import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'ID token/credential retornado pelo Google Identity Services.',
  })
  @IsString()
  @IsNotEmpty()
  credential!: string;
}
