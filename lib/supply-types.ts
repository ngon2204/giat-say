export interface SupplyTypeOption {
  value: string
  label: string
  category: string
}

export const supplyTypes: SupplyTypeOption[] = [
  { value: "softener-comfort-baby-3l", label: "Nước xả Comfort Em bé 3L6", category: "Nước xả" },
  { value: "softener-comfort-sunny-3l7", label: "Nước xả Comfort Nắng mới 3L7", category: "Nước xả" },
  { value: "softener-comfort-dry-2l", label: "Nước xả Comfort Kiêu Sa 3L7", category: "Nước xả" },
  { value: "softener-comfort-banmai-3l7", label: "Nước xả Comfort Ban mai 3L7", category: "Nước xả" },
  { value: "softener-ecolife", label: "Nước xả Comfort Vườn Xuân 3L7", category: "Nước xả" },
  { value: "softener-hygiene-3l5", label: "Nước xả Hygiene 3L5", category: "Nước xả" },
  { value: "softener-downy-3l", label: "Nước xả Downy 3L", category: "Nước xả" },
  { value: "softener-downy-3l5", label: "Nước xả Downy 3.5L", category: "Nước xả" },
  { value: "softener-downy-4l-204", label: "Nước xả Downy 4L", category: "Nước xả" },
  { value: "softener-bella-3l5", label: "Nước xả Bella 3L", category: "Nước xả" },
  { value: "softener-downy-3l-157", label: "Nước xả Ecolife 3.5L", category: "Nước xả" },
  { value: "softener-dly", label: "Nước xả DLY", category: "Nước xả" },
  { value: "detergent-lix", label: "Nước giặt Lix", category: "Nước giặt" },
  { value: "detergent-ecolife", label: "Nước giặt Ecolife", category: "Nước giặt" },
  { value: "powder-detergent-lix", label: "Bột giặt Lix", category: "Bột giặt" },
  { value: "powder-detergent-pao", label: "Bột giặt Pao", category: "Bột giặt" },
  { value: "baking-soda", label: "Baking Soda", category: "Chất tẩy" },
  { value: "vinegar", label: "Giấm", category: "Chất tẩy" },
  { value: "dish-soap", label: "Nước rửa chén", category: "Chất tẩy" },
  { value: "bleach", label: "Thuốc tẩy", category: "Chất tẩy" },
]

const supplyTypeMap = new Map(supplyTypes.map((item) => [item.value, item]))

export function getSupplyType(type: string) {
  return supplyTypeMap.get(type)
}

export function getSupplyLabel(type: string) {
  return getSupplyType(type)?.label ?? type
}
