import { getAuth } from 'firebase/auth';

import { app } from '@/config/firebase-app';

export const auth = getAuth(app);
