import { auth, db, storage } from '../config/firebaseConfig';

export const getFirebaseServices = () => ({
  auth,
  db,
  storage,
});

export { auth, db, storage };