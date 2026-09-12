const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, isAdmin, isSuperAdmin } = require('../middleware/authMiddleware');

// ─── All routes require authentication ──────────────────────
router.use(authenticateToken);

// ─── Protected Routes (All authenticated users) ─────────────
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

// ─── Admin Only Routes (Admin & Super Admin) ────────────────
router.get('/', isAdmin, userController.getAllUsers);
router.get('/:id', isAdmin, userController.getUserById);
router.post('/', isAdmin, userController.createUser);
router.put('/:id', isAdmin, userController.updateUser);
router.delete('/:id', isAdmin, userController.deleteUser);

module.exports = router;