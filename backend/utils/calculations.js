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
  previewPrice
};

