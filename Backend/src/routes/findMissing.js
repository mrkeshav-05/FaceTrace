import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
    createMissingPerson,
    searchMissingPersons,
    getMissingPersonById,
    updateMissingPersonStatus,
    getMissingPersonsByUserId,
    getAllMissingPersons,
} from '../controllers/findMissing.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// POST /api/v1/missing-persons
router.post(
    '/',
    verifyToken,
    //   authorize('authority', 'admin'),
    upload.array('photos', 5), // Handle multiple images (max 5)
    createMissingPerson,
);

// GET /api/v1/missing-persons (get all missing persons)
router.get('/', getAllMissingPersons);

// POST /api/v1/missing-persons/search (changed to POST for file upload)
router.post('/search', upload.array('images', 5), searchMissingPersons);

// GET /api/v1/missing-persons/user
router.get('/user', verifyToken, getMissingPersonsByUserId);
// POST /api/v1/missing-persons/matches
router.get('/:id', verifyToken, getMissingPersonById);

// PUT /api/v1/missing-persons/:id/status
router.put(
    '/:id/status',
    verifyToken,
    //   authorize('authority', 'admin'),
    updateMissingPersonStatus,
);

export default router;
