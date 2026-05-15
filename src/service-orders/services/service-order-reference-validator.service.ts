import { BadRequestException, Injectable } from '@nestjs/common';
import { ClientsService } from 'src/clients/clients.service';
import { UsersService } from 'src/users/users.service';
import { VehiclesService } from 'src/vehicles/vehicles.service';

@Injectable()
export class ServiceOrderReferenceValidatorService {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly vehiclesService: VehiclesService,
    private readonly usersService: UsersService,
  ) {}

  async validate(workshopId: string, clientId: string, vehicleId: string, mechanicId?: string) {
    const [client, vehicle] = await Promise.all([
      this.clientsService.ensureExists(workshopId, clientId),
      this.vehiclesService.ensureExists(workshopId, vehicleId),
    ]);

    if (vehicle.clientId !== client.id) {
      throw new BadRequestException('O veiculo nao pertence ao cliente informado');
    }

    if (mechanicId) {
      const mechanic = await this.usersService.findById(workshopId, mechanicId);
      if (mechanic.workshopId !== workshopId) {
        throw new BadRequestException('Mecanico informado e invalido');
      }
    }
  }
}
