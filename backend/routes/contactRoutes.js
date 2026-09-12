const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// ─── Public Route ─────────────────────────────────────────────
router.post('/', contactController.submitContact);

// ─── Admin Only Routes ────────────────────────────────────────
router.get('/', authenticateToken, isAdmin, contactController.getAllContacts);
router.get('/:id', authenticateToken, isAdmin, contactController.getContactById);
router.put('/:id/status', authenticateToken, isAdmin, contactController.updateContactStatus);
router.delete('/:id', authenticateToken, isAdmin, contactController.deleteContact);

module.exports = router;