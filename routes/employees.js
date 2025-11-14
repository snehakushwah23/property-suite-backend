const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// GET /api/employees/top-performers - Get top performing employees (MUST be before /:id route)
router.get('/top-performers', async (req, res) => {
  try {
    const { limit = 10, month } = req.query;
    
    const topPerformers = await Employee.getTopPerformers(parseInt(limit), month);
    
    // Format response for frontend
    const formattedPerformers = topPerformers.map(emp => ({
      name: emp.employeeName,
      score: emp.monthlyPerformance,
      tasksCompleted: emp.totalSalesAchieved || 0,
      month: month || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      photo: emp.photo,
      department: emp.department,
      role: emp.role
    }));

    res.json(formattedPerformers);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// GET /api/employees - Get all employees
router.get('/', async (req, res) => {
  try {
    const { department, role, isActive = true } = req.query;
    
    const filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const employees = await Employee.find(filter)
      .sort({ employeeName: 1 })
      .select('-__v');

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/employees/top-performers - Get top performing employees (must be before /:id route)
router.get('/top-performers', async (req, res) => {
  try {
    const { limit = 10, month } = req.query;
    
    const topPerformers = await Employee.getTopPerformers(parseInt(limit), month);
    
    // Format response for frontend
    const formattedPerformers = topPerformers.map(emp => ({
      name: emp.employeeName,
      score: emp.monthlyPerformance,
      tasksCompleted: emp.totalSalesAchieved || 0,
      month: month || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      photo: emp.photo,
      department: emp.department,
      role: emp.role
    }));

    res.json(formattedPerformers);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-__v');
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// POST /api/employees - Create new employee
router.post('/', async (req, res) => {
  try {
    const employeeData = req.body;
    
    // Validate required fields
    if (!employeeData.employeeName || !employeeData.employeeName.trim()) {
      return res.status(400).json({ error: 'Employee name is required' });
    }

    // Check if employee with same name already exists
    const existingEmployee = await Employee.findOne({ 
      employeeName: employeeData.employeeName.trim(),
      isActive: true 
    });
    
    if (existingEmployee) {
      return res.status(400).json({ error: 'Employee with this name already exists' });
    }

    const employee = new Employee(employeeData);
    const savedEmployee = await employee.save();

    res.status(201).json(savedEmployee);
  } catch (error) {
    console.error('Error creating employee:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if updating name and if new name already exists
    if (req.body.employeeName && req.body.employeeName !== employee.employeeName) {
      const existingEmployee = await Employee.findOne({ 
        employeeName: req.body.employeeName.trim(),
        isActive: true,
        _id: { $ne: req.params.id }
      });
      
      if (existingEmployee) {
        return res.status(400).json({ error: 'Employee with this name already exists' });
      }
    }

    Object.assign(employee, req.body);
    const updatedEmployee = await employee.save();

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id - Soft delete employee (set isActive to false)
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    employee.isActive = false;
    await employee.save();

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// POST /api/employees/:id/attendance - Record attendance (GPS check-in)
router.post('/:id/attendance', async (req, res) => {
  try {
    const { lat, lng, accuracy, deviceInfo, timestamp } = req.body;
    const employeeId = req.params.id;
    
    // Validate required fields
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Find employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if employee already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employeeId: employeeId,
      checkInTime: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({ 
        error: 'Already checked in today',
        existingCheckIn: existingAttendance
      });
    }

    // Create attendance record
    const attendance = new Attendance({
      employeeId: employeeId,
      employeeName: employee.employeeName,
      checkInLat: lat,
      checkInLng: lng,
      accuracy: accuracy || 0,
      deviceInfo: deviceInfo || '',
      checkInTime: timestamp ? new Date(timestamp) : new Date()
    });

    const savedAttendance = await attendance.save();

    // Update employee's last check-in
    await employee.updateCheckIn(lat, lng, accuracy, deviceInfo);

    res.status(201).json({
      message: 'Check-in successful',
      attendance: savedAttendance,
      lat: lat,
      lng: lng,
      accuracy: accuracy,
      timestamp: savedAttendance.checkInTime
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// GET /api/employees/:id/attendance - Get employee attendance history
router.get('/:id/attendance', async (req, res) => {
  try {
    const { month, year, limit = 30 } = req.query;
    const employeeId = req.params.id;

    let filter = { employeeId: employeeId };
    
    // Add date filtering if month and year provided
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.checkInTime = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(filter)
      .sort({ checkInTime: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// GET /api/employees/:id/performance - Get employee performance summary
router.get('/:id/performance', async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    const employeeId = req.params.id;

    // Get employee details
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get attendance summary
    const attendanceSummary = await Attendance.getEmployeeAttendanceSummary(
      employeeId, 
      parseInt(month), 
      parseInt(year)
    );

    // Calculate performance metrics
    const performanceData = {
      employee: {
        id: employee._id,
        name: employee.employeeName,
        role: employee.role,
        department: employee.department,
        photo: employee.photo
      },
      month: parseInt(month),
      year: parseInt(year),
      performance: {
        score: employee.monthlyPerformance,
        percentage: employee.performancePercentage,
        salesTarget: employee.totalSalesTarget,
        salesAchieved: employee.totalSalesAchieved,
        salesPercentage: employee.salesAchievementPercentage
      },
      attendance: attendanceSummary[0] || {
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        totalWorkingHours: 0,
        avgWorkingHours: 0
      }
    };

    res.json(performanceData);
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

module.exports = router;