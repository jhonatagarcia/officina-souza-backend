export interface ConvertedBudgetServiceOrderSummaryDto {
  id: string;
  orderNumber: string;
  status: string;
}

export interface ConvertBudgetResponseDto {
  id: string;
  convertedToServiceOrder: boolean;
  serviceOrder: ConvertedBudgetServiceOrderSummaryDto;
}
