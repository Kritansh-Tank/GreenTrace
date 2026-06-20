// IPCC AR6 & EPA 2023 Emission Factors

export const EMISSION_FACTORS = {
  travel: {
    flight_short: 0.255,    // kg CO₂e/km/passenger (< 3h flight)
    flight_long: 0.195,     // kg CO₂e/km/passenger (> 3h flight)
    car_petrol: 0.192,      // kg CO₂e/km
    car_diesel: 0.171,      // kg CO₂e/km
    ev: 0.053,              // kg CO₂e/km (India grid)
    bus: 0.089,             // kg CO₂e/km/passenger
    train: 0.041,           // kg CO₂e/km/passenger
    motorcycle: 0.113,      // kg CO₂e/km
    bicycle: 0.0,
    walking: 0.0,
  },
  food: {
    beef: 27.0,             // kg CO₂e/kg food
    lamb: 39.2,
    pork: 12.1,
    chicken: 6.9,
    fish: 6.1,
    eggs: 4.8,
    dairy_milk: 3.2,        // kg CO₂e/liter
    cheese: 13.5,           // kg CO₂e/kg
    vegetables: 0.4,        // kg CO₂e/kg
    fruits: 0.7,
    legumes: 0.9,
    grains: 0.75,
  },
  energy: {
    electricity_india: 0.82,   // kg CO₂e/kWh
    electricity_us: 0.386,
    electricity_eu: 0.295,
    electricity_uk: 0.207,
    natural_gas: 2.04,         // kg CO₂e/m³
    lpg: 1.51,                 // kg CO₂e/liter
    heating_oil: 2.68,         // kg CO₂e/liter
  },
  shopping: {
    online_parcel: 0.5,        // kg CO₂e/package
    clothing_new: 10.0,        // kg CO₂e/item
    electronics_phone: 70.0,   // kg CO₂e/device
    electronics_laptop: 350.0, // kg CO₂e/device
    furniture: 45.0,           // kg CO₂e/item
  },
  commute: {
    car_petrol: 0.192,
    car_diesel: 0.171,
    ev: 0.053,
    motorcycle: 0.113,
    bus: 0.089,
    metro: 0.041,
    bicycle: 0.0,
    walking: 0.0,
  }
} as const

// Global reference values (tonnes CO₂e/year)
export const REFERENCE_VALUES = {
  world_average: 4.7,
  india_average: 1.9,
  us_average: 14.9,
  paris_target: 2.0,
  net_zero_target: 0.5,
}
