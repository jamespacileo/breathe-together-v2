import type * as THREE from 'three';

export type MaterialWithUserData<TUserData extends object> = THREE.Material & {
  userData: TUserData;
};

export function setMaterialUserData<TUserData extends object>(
  material: THREE.Material,
  userData: TUserData,
): MaterialWithUserData<TUserData> {
  const typed = material as unknown as MaterialWithUserData<TUserData>;
  typed.userData = userData;
  return typed;
}

export function getMaterialUserData<TUserData extends object>(
  material: THREE.Material,
): TUserData | undefined {
  const typed = material as unknown as Partial<MaterialWithUserData<TUserData>>;
  return typed.userData;
}
