WITH ordered_service_orders AS (
  SELECT
    id,
    order_number,
    ROW_NUMBER() OVER (ORDER BY "openedAt" ASC, "createdAt" ASC, id ASC) AS sequence_number
  FROM (
    SELECT
      "id" AS id,
      "orderNumber" AS order_number,
      "openedAt",
      "createdAt"
    FROM "ServiceOrder"
  ) service_orders
),
temporary_numbers AS (
  UPDATE "ServiceOrder" service_order
  SET "orderNumber" = CONCAT('TMP-OS-', ordered_service_orders.sequence_number::text)
  FROM ordered_service_orders
  WHERE service_order."id" = ordered_service_orders.id
  RETURNING
    service_order."id",
    ordered_service_orders.order_number AS previous_order_number,
    ordered_service_orders.sequence_number
),
final_numbers AS (
  UPDATE "ServiceOrder" service_order
  SET "orderNumber" = CONCAT('OS', LPAD(temporary_numbers.sequence_number::text, 6, '0'))
  FROM temporary_numbers
  WHERE service_order."id" = temporary_numbers."id"
  RETURNING
    service_order."id",
    temporary_numbers.previous_order_number,
    service_order."orderNumber" AS new_order_number
)
UPDATE "FinancialEntry" financial_entry
SET "description" = CONCAT('Cobranca da ', final_numbers.new_order_number)
FROM final_numbers
WHERE financial_entry."serviceOrderId" = final_numbers."id"
  AND financial_entry."description" = CONCAT('Cobranca da ', final_numbers.previous_order_number);
