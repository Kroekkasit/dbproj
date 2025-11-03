const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get carrier profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'carrier') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [carriers] = await pool.execute(
      'SELECT CarrierID, firstname, lastname, phone, email, vehInfo, vehLicense, EmploymentType, isAvailable FROM Carrier WHERE CarrierID = ?',
      [req.user.carrierID]
    );

    if (carriers.length === 0) {
      return res.status(404).json({ message: 'Carrier not found' });
    }

    res.json({ carrier: carriers[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update carrier profile
router.put('/profile', authMiddleware, [
  body('firstname').optional().notEmpty(),
  body('lastname').optional().notEmpty(),
  body('phone').optional().notEmpty(),
  body('vehInfo').optional(),
  body('vehLicense').optional(),
  body('EmploymentType').optional(),
  body('isAvailable').optional().isBoolean()
], async (req, res) => {
  try {
    if (req.user.type !== 'carrier') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstname, lastname, phone, vehInfo, vehLicense, EmploymentType, isAvailable } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (firstname) {
      updates.push('firstname = ?');
      values.push(firstname);
    }
    if (lastname) {
      updates.push('lastname = ?');
      values.push(lastname);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (vehInfo !== undefined) {
      updates.push('vehInfo = ?');
      values.push(vehInfo);
    }
    if (vehLicense !== undefined) {
      updates.push('vehLicense = ?');
      values.push(vehLicense);
    }
    if (EmploymentType !== undefined) {
      updates.push('EmploymentType = ?');
      values.push(EmploymentType);
    }
    if (isAvailable !== undefined) {
      updates.push('isAvailable = ?');
      values.push(isAvailable);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(req.user.carrierID);

    await pool.execute(
      `UPDATE Carrier SET ${updates.join(', ')} WHERE CarrierID = ?`,
      values
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available parcels for carrier (parcels waiting for pickup)
router.get('/available-parcels', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'carrier') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [parcels] = await pool.execute(
      `SELECT p.*, pa.AssignmentID, pa.Status as assignmentStatus,
       ol.Address as orgAddress, ol.District as orgDistrict, ol.Province as orgProvince,
       dl.Address as destAddress, dl.District as destDistrict, dl.Province as destProvince,
       u.firstname as senderFirstName, u.lastname as senderLastName,
       pt.Name as packageName, pt.Type as packageType, pt.Size as packageSize,
       pt.dimension_x as packageDimensionX, pt.dimension_y as packageDimensionY, pt.dimension_z as packageDimensionZ
       FROM Parcel p
       INNER JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
       LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
       LEFT JOIN Location ol ON pol.LocationID = ol.LocationID
       LEFT JOIN ParcelLocation pdl ON p.ParcelID = pdl.ParcelID AND pdl.LocationType = 'Destination'
       LEFT JOIN Location dl ON pdl.LocationID = dl.LocationID
       LEFT JOIN User u ON p.SenderID = u.UserID
       LEFT JOIN PackageType pt ON p.SelectedPackageID = pt.PackageTypeID
       WHERE p.Status = 'Pending' AND pa.Status = 'Pending'
       ORDER BY p.CreatedAt DESC`
    );

    res.json({ parcels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept parcel assignment (carrier accepts to pick up)
router.post('/accept-parcel/:parcelID', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'carrier') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { parcelID } = req.params;

    // Check if parcel is available
    const [parcels] = await pool.execute(
      `SELECT p.*, pa.AssignmentID, pol.LocationID as orgLocationID FROM Parcel p
       INNER JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
       LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
       WHERE p.ParcelID = ? AND p.Status = 'Pending' AND pa.Status = 'Pending'`,
      [parcelID]
    );

    if (parcels.length === 0) {
      return res.status(404).json({ message: 'Parcel not available' });
    }

    // Update assignment
    await pool.execute(
      'UPDATE ParcelAssignment SET CarrierID = ?, Status = ? WHERE AssignmentID = ?',
      [req.user.carrierID, 'Accepted', parcels[0].AssignmentID]
    );

    // Update parcel status to Awaiting Pickup
    await pool.execute(
      'UPDATE Parcel SET Status = ? WHERE ParcelID = ?',
      ['Awaiting Pickup', parcelID]
    );

    // Create shipment event
    await pool.execute(
      `INSERT INTO ShipmentEvent (ParcelID, EventType, Status, Description, LocationID)
       VALUES (?, ?, ?, ?, ?)`,
      [parcelID, 'Accepted', 'Awaiting Pickup', 'Carrier accepted - will pick up parcel', parcels[0].orgLocationID]
    );

    // Create notification for sender
    await pool.execute(
      `INSERT INTO Notification (UserID, Type, Title, Message, IsRead, ParcelID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [parcels[0].SenderID, 'ParcelAccepted', 'Carrier Accepted',
       `Your parcel ${parcels[0].TrackingNumber} has been accepted by a carrier. They will pick it up soon.`,
       false, parcelID]
    );

    res.json({ message: 'Parcel accepted successfully. Please proceed to pickup location to measure the parcel.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit measurements and calculate price (after pickup)
router.post('/submit-measurements/:parcelID', authMiddleware, [
  body('weight').isFloat({ min: 0.1 })
], async (req, res) => {
  try {
    if (req.user.type !== 'carrier') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { parcelID } = req.params;
    const { weight, dimension_x, dimension_y, dimension_z } = req.body;

    // Check if carrier is assigned and status is correct, and get package info
    const [assignments] = await pool.execute(
      `SELECT pa.*, p.*, l.Province as orgProvince, pol.LocationID as orgLocationID,
       pt.dimension_x as packageDimensionX, pt.dimension_y as packageDimensionY, pt.dimension_z as packageDimensionZ
       FROM ParcelAssignment pa
       INNER JOIN Parcel p ON pa.ParcelID = p.ParcelID
       LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
       LEFT JOIN Location l ON pol.LocationID = l.LocationID
       LEFT JOIN PackageType pt ON p.SelectedPackageID = pt.PackageTypeID
       WHERE pa.ParcelID = ? AND pa.CarrierID = ? AND pa.Status = 'Accepted'`,
      [parcelID, req.user.carrierID]
    );

    if (assignments.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this parcel' });
    }

    const parcel = assignments[0];
    const errors = validationResult(req);
    
    // Determine dimensions (use package dimensions if package was purchased, otherwise validate provided dimensions)
    let finalDimensionX, finalDimensionY, finalDimensionZ;

    if (parcel.SelectedPackageID) {
      // Use package dimensions
      if (parcel.packageDimensionX && parcel.packageDimensionY && parcel.packageDimensionZ) {
        finalDimensionX = parcel.packageDimensionX;
        finalDimensionY = parcel.packageDimensionY;
        finalDimensionZ = parcel.packageDimensionZ;
      } else {
        const [packages] = await pool.execute(
          'SELECT dimension_x, dimension_y, dimension_z FROM PackageType WHERE PackageTypeID = ?',
          [parcel.SelectedPackageID]
        );
        if (packages.length > 0) {
          finalDimensionX = packages[0].dimension_x;
          finalDimensionY = packages[0].dimension_y;
          finalDimensionZ = packages[0].dimension_z;
        } else {
          return res.status(400).json({ message: 'Package information not found' });
        }
      }
      
      // Validate weight only when using package
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
    } else {
      // Use carrier-provided dimensions - validate dimensions are required
      if (!dimension_x || !dimension_y || !dimension_z) {
        return res.status(400).json({ 
          message: 'Dimensions are required when sender uses their own package',
          errors: [
            ...(!dimension_x ? [{ msg: 'Length (dimension_x) is required', param: 'dimension_x' }] : []),
            ...(!dimension_y ? [{ msg: 'Width (dimension_y) is required', param: 'dimension_y' }] : []),
            ...(!dimension_z ? [{ msg: 'Height (dimension_z) is required', param: 'dimension_z' }] : [])
          ]
        });
      }
      
      // Validate weight and dimensions
      if (isNaN(parseFloat(weight)) || parseFloat(weight) < 0.1) {
        return res.status(400).json({ message: 'Valid weight is required (min 0.1 kg)' });
      }
      if (isNaN(parseFloat(dimension_x)) || parseFloat(dimension_x) < 0.1) {
        return res.status(400).json({ message: 'Valid length is required (min 0.1 cm)' });
      }
      if (isNaN(parseFloat(dimension_y)) || parseFloat(dimension_y) < 0.1) {
        return res.status(400).json({ message: 'Valid width is required (min 0.1 cm)' });
      }
      if (isNaN(parseFloat(dimension_z)) || parseFloat(dimension_z) < 0.1) {
        return res.status(400).json({ message: 'Valid height is required (min 0.1 cm)' });
      }
      
      finalDimensionX = parseFloat(dimension_x);
      finalDimensionY = parseFloat(dimension_y);
      finalDimensionZ = parseFloat(dimension_z);
    }

    // Get origin province
    const originProvince = parcel.orgProvince;
    
    // Get destination province
    const [destLocations] = await pool.execute(
      `SELECT l.Province as destProvince
       FROM ParcelLocation pdl
       INNER JOIN Location l ON pdl.LocationID = l.LocationID
       WHERE pdl.ParcelID = ? AND pdl.LocationType = 'Destination'`,
      [parcelID]
    );

    if (destLocations.length === 0) {
      return res.status(400).json({ message: 'Destination location not found' });
    }

    const destProvince = destLocations[0].destProvince;

    if (!originProvince || !destProvince) {
      return res.status(400).json({ message: 'Location information incomplete' });
    }

    // Calculate price and delivery date with plan
    const { calculatePriceWithPlan, calculateDeliveryDateWithPlan } = require('../utils/calculations');
    const priceResult = await calculatePriceWithPlan(weight, finalDimensionX, finalDimensionY, finalDimensionZ, originProvince, destProvince, parcel.DeliveryPlanID);
    const deliveryDate = await calculateDeliveryDateWithPlan(originProvince, destProvince, parcel.DeliveryPlanID);
    
    // Base delivery price
    const basePrice = priceResult.basePrice;
    // Fast delivery fee is already stored in parcel (from creation)
    const fastDeliveryFee = parseFloat(parcel.FastDeliveryFee) || 0;
    // Service fee is already stored in parcel (from creation)
    const serviceFee = parseFloat(parcel.ServiceFee) || 0;
    
    // Total delivery price = base + fast fee (service fee is charged separately at creation)
    const price = basePrice + fastDeliveryFee;

    // Check sender balance
    const [senders] = await pool.execute(
      'SELECT balance FROM User WHERE UserID = ?',
      [parcel.SenderID]
    );

    if (senders.length === 0) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // Price here is only the delivery price (PackagePrice was already charged at parcel creation)
    // Check if sender has enough balance for delivery price
    if (senders[0].balance < price) {
      return res.status(400).json({
        message: 'Sender has insufficient balance',
        required: price,
        current: senders[0].balance
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update parcel with measurements and delivery price (PackagePrice is stored separately)
      await connection.execute(
        `UPDATE Parcel SET weight = ?, dimension_x = ?, dimension_y = ?, dimension_z = ?,
         Price = ?, EstDeliveryDate = ?, Status = ?
         WHERE ParcelID = ?`,
        [parseFloat(weight), finalDimensionX, finalDimensionY, finalDimensionZ, price, deliveryDate, 'In Transit', parcelID]
      );

      // Deduct balance from sender
      await connection.execute(
        'UPDATE User SET balance = balance - ? WHERE UserID = ?',
        [price, parcel.SenderID]
      );

      // Create transaction record
      await connection.execute(
        `INSERT INTO Transaction (UserID, Type, Amount, Status, Description)
         VALUES (?, ?, ?, ?, ?)`,
        [parcel.SenderID, 'Parcel', price, 'Completed', `Delivery payment for parcel ${parcel.TrackingNumber}`]
      );

      // Create shipment event
      await connection.execute(
        `INSERT INTO ShipmentEvent (ParcelID, EventType, Status, Description, LocationID)
         VALUES (?, ?, ?, ?, ?)`,
        [parcelID, 'Picked Up', 'In Transit', `Parcel picked up. Weight: ${weight}kg, Dimensions: ${finalDimensionX}×${finalDimensionY}×${finalDimensionZ}cm`, parcel.orgLocationID]
      );

      // Create notification for sender
      const packagePriceForNotification = parseFloat(parcel.PackagePrice) || 0;
      const totalPriceForNotification = price + packagePriceForNotification + serviceFee;
      
      await connection.execute(
        `INSERT INTO Notification (UserID, Type, Title, Message, IsRead, ParcelID)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [parcel.SenderID, 'ParcelPickedUp', 'Parcel Picked Up',
         `Your parcel ${parcel.TrackingNumber} has been picked up. Final price: ฿${totalPriceForNotification.toFixed(2)}`,
         false, parcelID]
      );

      await connection.commit();

      // Calculate total for response (delivery price + package price + service fee already paid)
      const packagePrice = parseFloat(parcel.PackagePrice) || 0;
      const totalPrice = price + packagePrice + serviceFee;

      res.json({
        message: 'Measurements submitted and price calculated',
        baseDeliveryPrice: basePrice,
        fastDeliveryFee: fastDeliveryFee,
        deliveryPrice: price,
        packagePrice: packagePrice,
        serviceFee: serviceFee,
        totalPrice: totalPrice,
        price: totalPrice, // Keep for backward compatibility
        estimatedDeliveryDate: deliveryDate.toISOString()
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get carrier's assigned parcels
router.get('/my-parcels', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'carrier') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [parcels] = await pool.execute(
      `SELECT p.*, pa.AssignmentID, pa.Status as assignmentStatus,
       ol.Address as orgAddress, ol.District as orgDistrict, ol.Province as orgProvince,
       dl.Address as destAddress, dl.District as destDistrict, dl.Province as destProvince,
       u.firstname as senderFirstName, u.lastname as senderLastName,
       pt.Name as packageName, pt.Size as packageSize,
       pt.dimension_x as packageDimensionX, pt.dimension_y as packageDimensionY, pt.dimension_z as packageDimensionZ
       FROM Parcel p
       INNER JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
       LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
       LEFT JOIN Location ol ON pol.LocationID = ol.LocationID
       LEFT JOIN ParcelLocation pdl ON p.ParcelID = pdl.ParcelID AND pdl.LocationType = 'Destination'
       LEFT JOIN Location dl ON pdl.LocationID = dl.LocationID
       LEFT JOIN User u ON p.SenderID = u.UserID
       LEFT JOIN PackageType pt ON p.SelectedPackageID = pt.PackageTypeID
       WHERE pa.CarrierID = ? AND pa.Status = 'Accepted'
       ORDER BY p.CreatedAt DESC`,
      [req.user.carrierID]
    );

    res.json({ parcels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get route stops for a parcel
router.get('/route-stops/:parcelID', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'carrier') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { parcelID } = req.params;

    // Check if carrier is assigned to this parcel
    const [assignments] = await pool.execute(
      'SELECT * FROM ParcelAssignment WHERE CarrierID = ? AND ParcelID = ?',
      [req.user.carrierID, parcelID]
    );

    if (assignments.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this parcel' });
    }

    // Get route stops with warehouse info (all stops)
    const [routeStops] = await pool.execute(
      `SELECT rs.*, l.Address, l.District, l.Subdistrict, l.Province, w.Name as WarehouseName, w.Code as WarehouseCode
       FROM RouteStop rs
       INNER JOIN Location l ON rs.LocationID = l.LocationID
       LEFT JOIN Warehouse w ON rs.WarehouseID = w.WarehouseID
       INNER JOIN Route r ON rs.RouteID = r.RouteID
       WHERE r.ParcelID = ?
       ORDER BY rs.Sequence ASC`,
      [parcelID]
    );

    res.json({ routeStops });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update parcel status (for carrier)
router.post('/update-status/:parcelID', authMiddleware, [
  body('eventType').optional(),
  body('status').optional(),
  body('description').optional(),
  body('routeStopID').optional()
], async (req, res) => {
  try {
    if (req.user.type !== 'carrier') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { parcelID } = req.params;
    const { eventType, status, description, locationID, routeStopID, isLate } = req.body;

    // Check if carrier is assigned to this parcel
    const [assignments] = await pool.execute(
      'SELECT * FROM ParcelAssignment WHERE CarrierID = ? AND ParcelID = ?',
      [req.user.carrierID, parcelID]
    );

    if (assignments.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this parcel' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // If routeStopID is provided, update the route stop (warehouse arrival)
      if (routeStopID) {
        // Validate required fields for route stop update
        if (isLate === undefined) {
          await connection.rollback();
          return res.status(400).json({ message: 'isLate field is required for route stop updates' });
        }
        const stopStatus = isLate ? 'Late' : 'Completed';
        const [routeStops] = await connection.execute(
          `SELECT rs.*, w.Name as WarehouseName
           FROM RouteStop rs
           LEFT JOIN Warehouse w ON rs.WarehouseID = w.WarehouseID
           WHERE rs.StopID = ? AND rs.RouteID IN (SELECT RouteID FROM Route WHERE ParcelID = ?)`,
          [routeStopID, parcelID]
        );

        if (routeStops.length === 0) {
          await connection.rollback();
          return res.status(404).json({ message: 'Route stop not found' });
        }

        const routeStop = routeStops[0];

        // Update route stop
        await connection.execute(
          `UPDATE RouteStop SET StopStatus = ?, AAT = NOW()
           WHERE StopID = ?`,
          [stopStatus, routeStopID]
        );

        // Get warehouse name for description
        const warehouseInfo = routeStop.WarehouseName ? ` at ${routeStop.WarehouseName}` : '';
        const eventDescription = description || 
          (isLate ? `Arrived late${warehouseInfo}` : `Arrived${warehouseInfo}`);

        // Create shipment event with warehouse location
        await connection.execute(
          `INSERT INTO ShipmentEvent (ParcelID, EventType, Status, Description, LocationID)
           VALUES (?, ?, ?, ?, ?)`,
          [parcelID, eventType || 'Warehouse Arrival', status, eventDescription, routeStop.LocationID]
        );

        // Check if all route stops are completed
        const [remainingStops] = await connection.execute(
          `SELECT COUNT(*) as count FROM RouteStop rs
           INNER JOIN Route r ON rs.RouteID = r.RouteID
           WHERE r.ParcelID = ? AND rs.StopStatus NOT IN ('Completed', 'Late')`,
          [parcelID]
        );

        if (remainingStops[0].count === 0) {
          // All stops completed, update route status
          await connection.execute(
            `UPDATE Route SET Status = 'Completed' 
             WHERE ParcelID = ?`,
            [parcelID]
          );
        }

        await connection.commit();

        const response = { message: 'Status updated successfully' };
        if (routeStop.WarehouseName) {
          response.warehouseName = routeStop.WarehouseName;
        }

        res.json(response);
        return;
      } else {
        // Regular status update without route stop
        // Validate required fields
        if (!eventType || !status) {
          await connection.rollback();
          return res.status(400).json({ message: 'eventType and status are required for regular status updates' });
        }

        // First check if there are pending route stops - if so, only allow route stop updates
        const [pendingRouteStops] = await connection.execute(
          `SELECT COUNT(*) as count FROM RouteStop rs
           INNER JOIN Route r ON rs.RouteID = r.RouteID
           WHERE r.ParcelID = ? AND rs.StopStatus = 'Pending' AND rs.WarehouseID IS NOT NULL`,
          [parcelID]
        );

        if (pendingRouteStops[0].count > 0) {
          await connection.rollback();
          return res.status(400).json({ 
            message: 'There are pending warehouse stops. Please update route stops instead.',
            pendingStops: pendingRouteStops[0].count
          });
        }

        await connection.execute(
          `INSERT INTO ShipmentEvent (ParcelID, EventType, Status, Description, LocationID)
           VALUES (?, ?, ?, ?, ?)`,
          [parcelID, eventType, status, description || '', locationID || null]
        );

        // Update parcel status if needed
        if (status === 'Delivered') {
          await connection.execute(
            'UPDATE Parcel SET Status = ? WHERE ParcelID = ?',
            ['Delivered', parcelID]
          );
        } else {
          await connection.execute(
            'UPDATE Parcel SET Status = ? WHERE ParcelID = ?',
            ['In Transit', parcelID]
          );
        }

        // Create notification for sender
        const [parcels] = await connection.execute(
          'SELECT SenderID, TrackingNumber FROM Parcel WHERE ParcelID = ?',
          [parcelID]
        );

        if (parcels.length > 0) {
          await connection.execute(
            `INSERT INTO Notification (UserID, Type, Title, Message, IsRead, ParcelID)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [parcels[0].SenderID, 'StatusUpdate', 'Parcel Status Update',
             `Your parcel ${parcels[0].TrackingNumber} status: ${status}`,
             false, parcelID]
          );
        }

        await connection.commit();
        res.json({ message: 'Status updated successfully' });
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
