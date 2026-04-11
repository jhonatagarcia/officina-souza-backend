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

  async validate(clientId: string, vehicleId: string, mechanicId?: string) {
    const [client, vehicle] = await Promise.all([
      this.clientsService.ensureExists(clientId),
      this.vehiclesService.ensureExists(vehicleId),
    ]);

    if (vehicle.clientId !== client.id) {
      throw new BadRequestException('O veiculo nao pertence ao cliente informado');
    }

    if (mechanicId) {
      await this.usersService.findById(mechanicId);
    }
  }
}
