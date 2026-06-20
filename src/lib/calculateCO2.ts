import { EMISSION_FACTORS } from './emissionFactors'
import type { CalculatorFormData, CO2Breakdown } from '@/types'

export function calculateCO2(data: CalculatorFormData): CO2Breakdown {
  // TRAVEL (per month — multiply trips)
  const travelFactor =
    data.travel.mode === 'flight_short'
      ? EMISSION_FACTORS.travel.flight_short
      : data.travel.mode === 'flight_long'
      ? EMISSION_FACTORS.travel.flight_long
      : EMISSION_FACTORS.travel[data.travel.mode as keyof typeof EMISSION_FACTORS.travel] ?? 0

  const travel_kg =
    (travelFactor * data.travel.distance * data.travel.trips) /
    Math.max(data.travel.passengers, 1)

  // FOOD (per month = weekly × 4.33)
  const paneerKg = (data.food.paneer_servings * 0.2 * 8.5 * 4.33)
  const chickenKg = (data.food.chicken_servings * 0.2 * EMISSION_FACTORS.food.chicken * 4.33)
  const fishKg = (data.food.fish_servings * 0.15 * EMISSION_FACTORS.food.fish * 4.33)
  const dairyKg = (data.food.dairy_liters * 4.33 * EMISSION_FACTORS.food.dairy_milk)
  const eggsKg = (data.food.eggs_per_week * 0.06 * EMISSION_FACTORS.food.eggs * 4.33)
  const plantReduction = data.food.plant_based_percent / 100
  const food_kg = (paneerKg + chickenKg + fishKg + dairyKg + eggsKg) * (1 - plantReduction * 0.5)

  // ENERGY (per month)
  const electricityFactor =
    EMISSION_FACTORS.energy[`electricity_${data.energy.country.toLowerCase()}` as keyof typeof EMISSION_FACTORS.energy] ??
    EMISSION_FACTORS.energy.electricity_india

  const solarReduction = data.energy.has_solar ? 0.4 : 0
  const energy_kg =
    data.energy.electricity_kwh * (electricityFactor as number) * (1 - solarReduction) +
    data.energy.gas_m3 * EMISSION_FACTORS.energy.natural_gas

  // SHOPPING (per month)
  const parcelKg = data.shopping.online_orders * EMISSION_FACTORS.shopping.online_parcel
  const clothingKg = (data.shopping.clothing_items / 12) * EMISSION_FACTORS.shopping.clothing_new
  const phoneKg = data.shopping.has_phone_new ? EMISSION_FACTORS.shopping.electronics_phone / 12 : 0
  const laptopKg = data.shopping.has_laptop_new ? EMISSION_FACTORS.shopping.electronics_laptop / 36 : 0
  const shopping_kg = parcelKg + clothingKg + phoneKg + laptopKg

  // COMMUTE (per month)
  const commuteFactor =
    EMISSION_FACTORS.commute[data.commute.mode as keyof typeof EMISSION_FACTORS.commute] ?? 0
  const commute_kg = commuteFactor * data.commute.km_per_day * data.commute.work_days

  const total_kg = travel_kg + food_kg + energy_kg + shopping_kg + commute_kg

  return {
    travel_kg: Math.round(travel_kg * 100) / 100,
    food_kg: Math.round(food_kg * 100) / 100,
    energy_kg: Math.round(energy_kg * 100) / 100,
    shopping_kg: Math.round(shopping_kg * 100) / 100,
    commute_kg: Math.round(commute_kg * 100) / 100,
    total_kg: Math.round(total_kg * 100) / 100,
  }
}
