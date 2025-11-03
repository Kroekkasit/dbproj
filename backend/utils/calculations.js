const pool = require('../config/database');

// Calculate delivery price based on weight, dimensions, and province mapping
const calculatePrice = async (weight, dimension_x, dimension_y, dimension_z, originProvince, destProvince) => {
  try {
    // Get province mapping
    const [mappings] = await pool.execute(
      `SELECT pm.Price, pm.DeliveryDays
       FROM ProvinceMapping pm
       INNER JOIN Province p1 ON pm.OriginProvinceID = p1.ProvinceID
       INNER JOIN Province p2 ON pm.DestProvinceID = p2.ProvinceID
       WHERE p1.Name = ? AND p2.Name = ?`,
      [originProvince, destProvince]
    );

    let basePrice = 50.00;
    if (mappings.length > 0) {
      basePrice = parseFloat(mappings[0].Price);
    } else {
      // Fallback: calculate from individual province base prices
      const [provinces] = await pool.execute(
        'SELECT BasePrice FROM Province WHERE Name IN (?, ?)',
        [originProvince, destProvince]
      );
      if (provinces.length === 2) {
        basePrice = (parseFloat(provinces[0].BasePrice) + parseFloat(provinces[1].BasePrice)) / 2 + 30;
      } else if (provinces.length === 1) {
        basePrice = parseFloat(provinces[0].BasePrice);
      }
    }

    // Weight-based pricing (per kg)
    const weightPrice = weight * 5; // 5 baht per kg

    // Volume calculation (dimensions in cm)
    const volume = (dimension_x * dimension_y * dimension_z) / 1000; // Convert to liters
    const volumePrice = volume * 2; // 2 baht per liter

    // Calculate total price
    const totalPrice = basePrice + weightPrice + volumePrice;

    return Math.round(totalPrice * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating price:', error);
    // Default price if calculation fails
    return 100.00;
  }
};

// Calculate estimated delivery date based on province mapping
const calculateDeliveryDate = async (originProvince, destProvince) => {
  try {
    const [mappings] = await pool.execute(
      `SELECT pm.DeliveryDays
       FROM ProvinceMapping pm
       INNER JOIN Province p1 ON pm.OriginProvinceID = p1.ProvinceID
       INNER JOIN Province p2 ON pm.DestProvinceID = p2.ProvinceID
       WHERE p1.Name = ? AND p2.Name = ?`,
      [originProvince, destProvince]
    );

    let deliveryDays = 3;
    if (mappings.length > 0) {
      deliveryDays = mappings[0].DeliveryDays;
    } else {
      // Fallback: get from destination province
      const [provinces] = await pool.execute(
        'SELECT DeliveryDays FROM Province WHERE Name = ?',
        [destProvince]
      );
      if (provinces.length > 0) {
        deliveryDays = provinces[0].DeliveryDays;
      }
    }

    // Calculate delivery date
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

    return deliveryDate;
  } catch (error) {
    console.error('Error calculating delivery date:', error);
    // Default to 3 days
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return defaultDate;
  }
};

// Get delivery plan by ID
const getDeliveryPlan = async (planID) => {
  try {
    const [plans] = await pool.execute(
      'SELECT * FROM DeliveryPlan WHERE PlanID = ? AND IsActive = TRUE',
      [planID]
    );
    return plans.length > 0 ? plans[0] : null;
  } catch (error) {
    console.error('Error getting delivery plan:', error);
    return null;
  }
};

// Get default delivery plan (Standard)
const getDefaultDeliveryPlan = async () => {
  try {
    const [plans] = await pool.execute(
      'SELECT * FROM DeliveryPlan WHERE Name = "Standard" AND IsActive = TRUE LIMIT 1'
    );
    return plans.length > 0 ? plans[0] : null;
  } catch (error) {
    console.error('Error getting default delivery plan:', error);
    return null;
  }
};

// Calculate price with delivery plan
const calculatePriceWithPlan = async (weight, dimension_x, dimension_y, dimension_z, originProvince, destProvince, planID = null) => {
  // Calculate base price
  const basePrice = await calculatePrice(weight, dimension_x, dimension_y, dimension_z, originProvince, destProvince);
  
  // Get delivery plan
  let plan = null;
  if (planID) {
    plan = await getDeliveryPlan(planID);
  }
  if (!plan) {
    plan = await getDefaultDeliveryPlan();
  }
  
  // Add fast delivery fee if plan is Fast
  const fastDeliveryFee = plan && plan.Name === 'Fast' ? parseFloat(plan.FastDeliveryFee) : 0.00;
  const totalPrice = basePrice + fastDeliveryFee;
  
  return {
    basePrice: Math.round(basePrice * 100) / 100,
    fastDeliveryFee: Math.round(fastDeliveryFee * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    plan
  };
};

// Calculate delivery date with plan
const calculateDeliveryDateWithPlan = async (originProvince, destProvince, planID = null) => {
  // Get base delivery date
  const baseDeliveryDate = await calculateDeliveryDate(originProvince, destProvince);
  
  // Get delivery plan
  let plan = null;
  if (planID) {
    plan = await getDeliveryPlan(planID);
  }
  if (!plan) {
    plan = await getDefaultDeliveryPlan();
  }
  
  // Reduce days if Fast plan
  const deliveryDate = new Date(baseDeliveryDate);
  if (plan && plan.Name === 'Fast') {
    deliveryDate.setDate(deliveryDate.getDate() - plan.DeliveryDaysReduction);
  }
  
  return deliveryDate;
};

// Calculate service fees
const calculateServiceFees = async (serviceIDs = []) => {
  if (!serviceIDs || serviceIDs.length === 0) {
    return {
      services: [],
      totalServiceFee: 0.00
    };
  }
  
  try {
    const placeholders = serviceIDs.map(() => '?').join(',');
    const [services] = await pool.execute(
      `SELECT * FROM OptionalService WHERE ServiceID IN (${placeholders}) AND IsActive = TRUE`,
      serviceIDs
    );
    
    let totalServiceFee = 0.00;
    services.forEach(service => {
      totalServiceFee += parseFloat(service.ServiceFee);
    });
    
    return {
      services,
      totalServiceFee: Math.round(totalServiceFee * 100) / 100
    };
  } catch (error) {
    console.error('Error calculating service fees:', error);
    return {
      services: [],
      totalServiceFee: 0.00
    };
  }
};

// Calculate price before creating parcel (for preview)
const previewPrice = async (weight, dimension_x, dimension_y, dimension_z, originProvince, destProvince) => {
  const price = await calculatePrice(weight, dimension_x, dimension_y, dimension_z, originProvince, destProvince);
  const deliveryDate = await calculateDeliveryDate(originProvince, destProvince);
  
  return {
    price,
    estimatedDeliveryDate: deliveryDate.toISOString()
  };
};

module.exports = {
  calculatePrice,
  calculateDeliveryDate,
  previewPrice,
  getDeliveryPlan,
  getDefaultDeliveryPlan,
  calculatePriceWithPlan,
  calculateDeliveryDateWithPlan,
  calculateServiceFees
};

