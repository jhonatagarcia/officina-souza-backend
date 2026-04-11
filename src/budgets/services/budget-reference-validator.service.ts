import { BadRequestException, Injectable } from '@nestjs/common';
import { ClientsService } from 'src/clients/clients.service';
import { VehiclesService } from 'src/vehicles/vehicles.service';

@Injectable()
export class BudgetReferenceValidatorService {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async validate(clientId: string, vehicleId: string) {
    const [client, vehicle] = await Promise.all([
      this.clientsService.ensureExists(clientId),
      this.vehiclesService.ensureExists(vehicleId),
    ]);

    if (vehicle.clientId !== client.id) {
      throw new BadRequestException('O veiculo nao pertence ao cliente informado');
    }
  }
}
