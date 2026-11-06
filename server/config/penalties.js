export const SPEED_LIMIT = 100;
export const LATE_FEE_PER_HOUR = 200;

export const speedFine = (speed) => (speed > 120 ? 2000 : speed > 110 ? 1000 : 500);

export const DEFAULT_DAMAGE = { minor_damage: 1500, major_damage: 10000 };