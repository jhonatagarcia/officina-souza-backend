import { isValidCnpj, normalizeCnpj } from 'src/workshops/utils/cnpj.util';
import { validate } from 'class-validator';
import { UpsertWorkshopDto } from 'src/workshops/dto/upsert-workshop.dto';

describe('cnpj util', () => {
  it('should normalize formatted CNPJ to digits only', () => {
    expect(normalizeCnpj('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('should accept valid CNPJ', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
  });

  it('should reject invalid CNPJ', () => {
    expect(isValidCnpj('11.222.333/0001-00')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('should reject invalid CNPJ at DTO validation when provided', async () => {
    const dto = new UpsertWorkshopDto();
    dto.tradeName = 'Oficina Paiva';
    dto.cnpj = '11.222.333/0001-00';

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'cnpj',
        }),
      ]),
    );
  });

  it('should allow missing CNPJ at DTO validation', async () => {
    const dto = new UpsertWorkshopDto();
    dto.tradeName = 'Oficina Paiva';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
