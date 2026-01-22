import { Router } from 'express';
import { updateUser, getUser, searchUsers } from '../controllers/userController';

const router = Router();

router.get('/:id', getUser);
router.put('/:id', updateUser);
router.get('/search', searchUsers);

export default router;
